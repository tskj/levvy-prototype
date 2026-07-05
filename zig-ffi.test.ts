/*
 * cross-checks the zig implementation (tarshtein-distance, loaded over FFI)
 * against the typescript implementations, on the real data files.
 *
 * skipped when the shared library hasn't been built -- build it with
 * `zig build -Doptimize=ReleaseFast` in ../tarshtein-distance
 *
 * note: zig works on bytes, typescript on utf-16 code units, so only
 * ascii lines and queries are comparable.
 */
import { test, expect } from "bun:test";
import { existsSync } from "fs";
import { dlopen, FFIType, ptr } from "bun:ffi";
import { iterativeLevvy_fast } from "./levvy";
import { files, getLines, queries } from "./utils";

const libPath = new URL("../tarshtein-distance/zig-out/lib/liblevvy.so", import.meta.url).pathname;
const haveLib = existsSync(libPath);

const isAscii = (s: string) => /^[\x20-\x7e]*$/.test(s);

type FuzzySearch = (q: number, n: number, lines: number, out: number) => number;

const openSymbol = (name: string): FuzzySearch | null => {
  try {
    const lib = dlopen(libPath, {
      [name]: {
        args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
    });
    return lib.symbols[name] as unknown as FuzzySearch;
  } catch {
    return null;
  }
};

const searchWith = (fn: FuzzySearch, query: string, lines: string[]): { distances: number[]; min: number } => {
  const qbuf = Buffer.from(query + "\0", "latin1");
  const bufs = lines.map(l => Buffer.from(l + "\0", "latin1"));
  const ptrs = new BigUint64Array(lines.length);
  for (let i = 0; i < bufs.length; i++) ptrs[i] = BigInt(ptr(bufs[i]));
  const out = new Uint16Array(lines.length);

  const min = fn(ptr(qbuf), lines.length, ptr(ptrs), ptr(out));

  return { distances: Array.from(out), min };
};

const checkAgainstTs = async (fn: FuzzySearch, label: string) => {
  for (const file of files) {
    const lines = (await getLines(file)).filter(isAscii);
    if (lines.length === 0) continue;
    const longest_line = Math.max(...lines.map(l => l.length));
    const curr = new Array((longest_line + 1) * 2);
    const prev = new Array((longest_line + 1) * 2);

    for (const query of queries.filter(isAscii)) {
      const { distances, min } = searchWith(fn, query, lines);

      let expected_min = Infinity;
      for (let i = 0; i < lines.length; i++) {
        const expected = iterativeLevvy_fast(query, lines[i], longest_line - lines[i].length, curr, prev);
        expected_min = Math.min(expected_min, expected);
        try {
          expect(distances[i]).toBe(expected);
        } catch (e) {
          console.error(`${label}: for query (${query})\nand line (${lines[i]})\nin file ${file}`);
          throw e;
        }
      }
      expect(min).toBe(expected_min);
    }
  }
};

test.skipIf(!haveLib)('zig fuzzy_search agrees with typescript implementation', async () => {
  const fuzzy_search = openSymbol("fuzzy_search");
  expect(fuzzy_search).not.toBeNull();
  await checkAgainstTs(fuzzy_search!, "fuzzy_search");
});

// only present once the simd implementation lands in tarshtein-distance
const fuzzy_search_simd = haveLib ? openSymbol("fuzzy_search_simd") : null;
test.skipIf(!fuzzy_search_simd)('zig fuzzy_search_simd agrees with typescript implementation', async () => {
  await checkAgainstTs(fuzzy_search_simd!, "fuzzy_search_simd");
});

// the suffix-scan variant of the simd implementation
const fuzzy_search_simd_scan = haveLib ? openSymbol("fuzzy_search_simd_scan") : null;
test.skipIf(!fuzzy_search_simd_scan)('zig fuzzy_search_simd_scan agrees with typescript implementation', async () => {
  await checkAgainstTs(fuzzy_search_simd_scan!, "fuzzy_search_simd_scan");
});

// the single-line scorer used by the telescope sorter: -1 when the query
// isn't a smart-case subsequence, otherwise the distance with the line
// padded to pad_to columns
const levvy_score = (() => {
  if (!haveLib) return null;
  try {
    const lib = dlopen(libPath, {
      levvy_score: { args: [FFIType.ptr, FFIType.ptr, FFIType.u32], returns: FFIType.i32 },
    });
    return lib.symbols.levvy_score;
  } catch {
    return null;
  }
})();

const isSmartCaseSubsequence = (q: string, h: string): boolean => {
  let qi = 0;
  for (let hi = 0; hi < h.length && qi < q.length; hi++) {
    let a = q.charCodeAt(qi);
    let b = h.charCodeAt(hi);
    if (97 <= a && a <= 122 && 65 <= b && b <= 90) b += 32; // smart case
    if (a === b) qi++;
  }
  return qi === q.length;
};

test.skipIf(!levvy_score)('zig levvy_score agrees with typescript implementation', async () => {
  const PAD_TO = 1024;
  for (const file of files) {
    const lines = (await getLines(file)).filter(isAscii).filter(l => l.length <= 2048);
    const longest = 1024;
    const curr = new Array((longest + 1) * 2);
    const prev = new Array((longest + 1) * 2);

    for (const query of queries.filter(isAscii)) {
      const qbuf = Buffer.from(query + "\0", "latin1");
      for (const line of lines) {
        const lbuf = Buffer.from(line + "\0", "latin1");
        const got = levvy_score!(ptr(qbuf), ptr(lbuf), PAD_TO);
        try {
          if (!isSmartCaseSubsequence(query, line)) {
            expect(got).toBe(-1);
          } else {
            const padding = Math.max(PAD_TO - line.length, 0);
            expect(got).toBe(iterativeLevvy_fast(query, line, padding, curr, prev));
          }
        } catch (e) {
          console.error(`levvy_score: for query (${query})\nand line (${line})\nin file ${file}`);
          throw e;
        }
      }
    }
  }
});

// the persistent handle api (cached preprocessing + optional worker pool)
const handleApi = (() => {
  if (!haveLib) return null;
  try {
    const lib = dlopen(libPath, {
      levvy_create: { args: [FFIType.ptr, FFIType.u32], returns: FFIType.ptr },
      levvy_search: { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u32], returns: FFIType.i32 },
      levvy_destroy: { args: [FFIType.ptr], returns: FFIType.void },
    });
    return lib.symbols;
  } catch {
    return null;
  }
})();

test.skipIf(!handleApi)('zig levvy handle api agrees with typescript implementation (1 thread and pool)', async () => {
  for (const file of files) {
    const lines = (await getLines(file)).filter(isAscii);
    if (lines.length === 0) continue;
    const longest_line = Math.max(...lines.map(l => l.length));
    const curr = new Array((longest_line + 1) * 2);
    const prev = new Array((longest_line + 1) * 2);

    const bufs = lines.map(l => Buffer.from(l + "\0", "latin1"));
    const ptrs = new BigUint64Array(lines.length);
    for (let i = 0; i < bufs.length; i++) ptrs[i] = BigInt(ptr(bufs[i]));

    const handle = handleApi!.levvy_create(ptr(ptrs), lines.length);
    expect(handle).not.toBe(0);

    try {
      for (const query of queries.filter(isAscii)) {
        const qbuf = Buffer.from(query + "\0", "latin1");
        const out_single = new Uint16Array(lines.length);
        const out_pool = new Uint16Array(lines.length);

        const min_single = handleApi!.levvy_search(handle, ptr(qbuf), ptr(out_single), 1);
        const min_pool = handleApi!.levvy_search(handle, ptr(qbuf), ptr(out_pool), 0);

        let expected_min = Infinity;
        for (let i = 0; i < lines.length; i++) {
          const expected = iterativeLevvy_fast(query, lines[i], longest_line - lines[i].length, curr, prev);
          expected_min = Math.min(expected_min, expected);
          try {
            expect(out_single[i]).toBe(expected);
            expect(out_pool[i]).toBe(expected);
          } catch (e) {
            console.error(`handle api: for query (${query})\nand line (${lines[i]})\nin file ${file}`);
            throw e;
          }
        }
        expect(min_single).toBe(expected_min);
        expect(min_pool).toBe(expected_min);
      }
    } finally {
      handleApi!.levvy_destroy(handle);
    }
  }
});
