/*
 * the property tests from notes.norg, over the parameterized
 * implementations in levvy.ts
 *
 * precondition everywhere: parameter configuration is non-negative integers
 */
import { test, expect } from "bun:test";
import {
  referenceLevvy,
  iterativeLevvy,
  iterativeLevvy_fast,
  path,
  default_params,
  type LevvyParams,
} from "./levvy";

// deterministic prng so failures are reproducible
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randInt = (rng: () => number, lo: number, hi: number) =>
  lo + Math.floor(rng() * (hi - lo + 1));

// mixed case, symbols and non-ascii, like real lines of code
const pool = "abcdefgXYZAbC_./(){}=:;<> \"'0123456789æøåÆØÅ";
const randString = (rng: () => number, maxLen: number) => {
  const len = randInt(rng, 0, maxLen);
  let s = "";
  for (let i = 0; i < len; i++) s += pool[randInt(rng, 0, pool.length - 1)];
  return s;
};

const randParams = (rng: () => number): LevvyParams => ({
  del_cost: randInt(rng, 0, 5),
  skip_cost: randInt(rng, 0, 5),
  sub_cost: randInt(rng, 0, 5),
  streak_bias: randInt(rng, 0, 5),
  length_bias: randInt(rng, 0, 5),
});

const dist = (q: string, h: string, padding: number, params: LevvyParams): number => {
  const curr = new Array((h.length + 1) * 2);
  const prev = new Array((h.length + 1) * 2);
  return iterativeLevvy_fast(q, h, padding, curr, prev, params);
};

const describeCase = (q: string, h: string, padding: number, params: LevvyParams) =>
  `q=(${q}) h=(${h}) padding=${padding} params=${JSON.stringify(params)}`;

test('all implementations agree, for all parameter configurations', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 300; i++) {
    const params = i === 0 ? default_params : randParams(rng);
    const q = randString(rng, 10);
    const h = randString(rng, 14);
    const padding = randInt(rng, 0, 6);

    const reference = referenceLevvy(new Map(), q, 0, h, 0, padding, false, params);
    const scratch = new Array((q.length + 1) * (h.length + 1) * 2);
    iterativeLevvy(q, h, padding, scratch, params);
    const full_table = scratch[0];
    const fast = dist(q, h, padding, params);
    const reconstructed = path(q, h, padding, scratch, params);

    try {
      expect(full_table).toBe(reference);
      expect(fast).toBe(reference);
      expect(reconstructed[1]).toBe(reference);
    } catch (e) {
      console.error(describeCase(q, h, padding, params));
      throw e;
    }
  }
});

test('property: when q == h and padding: 0, distance should be 0', () => {
  const rng = mulberry32(2);
  for (let i = 0; i < 300; i++) {
    const params = i === 0 ? default_params : randParams(rng);
    const s = randString(rng, 12);
    try {
      expect(dist(s, s, 0, params)).toBe(0);
    } catch (e) {
      console.error(describeCase(s, s, 0, params));
      throw e;
    }
  }
});

test('property: for all parameter configurations and padding >= 0, distance should be non-negative', () => {
  const rng = mulberry32(3);
  for (let i = 0; i < 500; i++) {
    const params = i === 0 ? default_params : randParams(rng);
    const q = randString(rng, 10);
    const h = randString(rng, 14);
    const padding = randInt(rng, 0, 8);
    try {
      expect(dist(q, h, padding, params)).toBeGreaterThanOrEqual(0);
    } catch (e) {
      console.error(describeCase(q, h, padding, params));
      throw e;
    }
  }
});

test('property: levvy(.., 0, ..) == levvy(.., padding, ..) - padding * length_bias, forall paddings', () => {
  const rng = mulberry32(4);
  for (let i = 0; i < 300; i++) {
    const params = i === 0 ? default_params : randParams(rng);
    const q = randString(rng, 10);
    const h = randString(rng, 14);
    const base = dist(q, h, 0, params);

    for (const padding of [1, 2, 5, 13, -1, -4]) {
      try {
        expect(base).toBe(dist(q, h, padding, params) - padding * params.length_bias);
      } catch (e) {
        console.error(describeCase(q, h, padding, params));
        throw e;
      }
    }
  }
});

test('property: setting length_bias=0 should be the same as passing padding: 0 and any length_bias', () => {
  const rng = mulberry32(5);
  for (let i = 0; i < 300; i++) {
    const params = randParams(rng);
    const q = randString(rng, 10);
    const h = randString(rng, 14);
    const padding = randInt(rng, -6, 6);
    try {
      expect(dist(q, h, padding, { ...params, length_bias: 0 }))
        .toBe(dist(q, h, 0, params));
    } catch (e) {
      console.error(describeCase(q, h, padding, params));
      throw e;
    }
  }
});

test('property: empty haystack costs q.length * del_cost; empty query costs h.length * skip_cost', () => {
  const rng = mulberry32(7);
  for (let i = 0; i < 200; i++) {
    const params = i === 0 ? default_params : randParams(rng);
    const q = randString(rng, 12);
    const h = randString(rng, 12);
    try {
      expect(dist(q, "", 0, params)).toBe(q.length * params.del_cost);
      expect(dist("", h, 0, params)).toBe(h.length * params.skip_cost);
    } catch (e) {
      console.error(describeCase(q, h, 0, params));
      throw e;
    }
  }
});

test('property: smart case: an all-lowercase query is case-insensitive in the haystack (ascii)', () => {
  const rng = mulberry32(8);
  const lowerPool = "abcdefghij_./ 0123";
  const recase = (s: string) =>
    s.split("").map(c => (rng() < 0.5 ? c.toUpperCase() : c)).join("");

  for (let i = 0; i < 200; i++) {
    const params = i === 0 ? default_params : randParams(rng);
    let q = "";
    for (let j = randInt(rng, 0, 8); j > 0; j--) q += lowerPool[randInt(rng, 0, lowerPool.length - 1)];
    let h = "";
    for (let j = randInt(rng, 0, 12); j > 0; j--) h += lowerPool[randInt(rng, 0, lowerPool.length - 1)];
    const h_recased = recase(h);

    try {
      expect(dist(q, h_recased, 0, params)).toBe(dist(q, h, 0, params));
    } catch (e) {
      console.error(describeCase(q, h_recased, 0, params));
      throw e;
    }
  }
});

// the whole point of the streak bias: the same characters matched contiguously
// must score strictly better than matched scattered, all else (lengths) equal
test('property: contiguous matches beat scattered matches (default params)', () => {
  const rng = mulberry32(9);
  const letters = "abcdefghijklmnop";
  for (let i = 0; i < 200; i++) {
    let q = "";
    for (let j = randInt(rng, 2, 6); j > 0; j--) q += letters[randInt(rng, 0, letters.length - 1)];
    const extra = randInt(rng, 0, 4);
    const gaps = q.length - 1 + extra;

    const contiguous = q + "_".repeat(gaps);
    const scattered = q.split("").join("_") + "_".repeat(extra);
    expect(contiguous.length).toBe(scattered.length);

    try {
      expect(dist(q, contiguous, 0, default_params))
        .toBeLessThan(dist(q, scattered, 0, default_params));
    } catch (e) {
      console.error(`q=(${q}) contiguous=(${contiguous}) scattered=(${scattered})`);
      throw e;
    }
  }
});

// with length_bias == skip_bias and padding = -h.length, scores are normalized
// wrt line length: an exact substring match ranks the same as the exact match
// levvy(q, q). (the notes asked "should this be 0?" -- it is not: both come out
// as -q.length * length_bias, which is what makes them rank equal.)
test('property: length_bias=skip_bias and padding=-h.length normalizes: substring ranks same as levvy(q, q)', () => {
  const rng = mulberry32(6);
  for (let i = 0; i < 300; i++) {
    const p = i === 0 ? default_params : randParams(rng);
    const params = { ...p, length_bias: p.skip_cost };

    const h = randString(rng, 14);
    const start = randInt(rng, 0, h.length);
    const end = randInt(rng, start, h.length);
    const q = h.slice(start, end);

    const normalized_substring = dist(q, h, -h.length, params);
    const normalized_exact = dist(q, q, -q.length, params);

    try {
      expect(normalized_substring).toBe(normalized_exact);
      expect(normalized_exact).toBe(0 - q.length * params.length_bias); // 0 - x avoids js negative zero
    } catch (e) {
      console.error(describeCase(q, h, -h.length, params));
      throw e;
    }
  }
});
