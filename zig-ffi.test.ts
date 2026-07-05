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
