const query = "cxoxntxixmxe";

const content = await Bun.file("data/test3.txt")
  .text()
  .then(x => x
    .split("\n"));

const longest_line =
    Math.max(...content.map(s => s.length));

console.time('my timer');

const del_cost = 1;
const skip_cost = 1;
const sub_cost = 1;
const streak_bias = 1;

export const referenceLevvy = (c: Map<string, number>, q: string, q_i: number, h: string, h_i: number, padding: number, consecutive_match = false): number => {
  const hash = `(${q_i}):(${h_i}):(${padding}):(${consecutive_match})`;
  if (c.has(hash)) {
    return c.get(hash) ?? (() => {throw "nei"})();
  }

  const h_len = h.length - h_i;
  const q_len = q.length - q_i;

  if (h_len === 0) {
    const dist = q_len * del_cost + padding * skip_cost;
    const result = dist as any
    c.set(hash, result);
    return result;
  }

  if (q_len === 0) {
    const dist = (h_len + padding) * skip_cost;
    const result = dist as any
    c.set(hash, result);
    return result;
  }

  if (q[q_i] === h[h_i]) {
    let skip = referenceLevvy(c, q, q_i, h, h_i + 1, padding) + skip_cost;
    let del = referenceLevvy(c, q, q_i + 1, h, h_i, padding, consecutive_match) + del_cost;
    let match = referenceLevvy(c, q, q_i + 1, h, h_i + 1, padding, true) - (consecutive_match ? streak_bias : 0);

    let result = Math.min(match, skip, del);
    c.set(hash, result);
    return result;
  }

  let del = referenceLevvy(c, q, q_i + 1, h, h_i, padding, consecutive_match) + del_cost;
  let skip = referenceLevvy(c, q, q_i, h, h_i + 1, padding) + skip_cost;
  let sub = referenceLevvy(c, q, q_i + 1, h, h_i + 1, padding) + sub_cost;

  const result = Math.min(del, skip, sub);
  c.set(hash, result);
  return result;
};

export const iterativeLevvy = (q: string, h: string, padding: number): number => {
  const q_len = q.length;
  const h_len = h.length;

  const worst_possible_distance = q_len * del_cost + h_len * skip_cost + padding * skip_cost;

  // Initialize dp table
  // dp[q_i][h_i][cm]
  const dp = Array(q_len + 1)
    .fill(0)
    .map(() =>
      Array(h_len + 1)
        .fill(0)
        .map(() => [worst_possible_distance + 1, worst_possible_distance + 1])
    );

  // Base cases
  for (let q_i = 0; q_i <= q_len; q_i++) {
    const dist = (q_len - q_i) * del_cost + padding * skip_cost;
    dp[q_i][h_len][0] = dist;
    dp[q_i][h_len][1] = dist;
  }
  for (let h_i = 0; h_i <= h_len; h_i++) {
    const dist = (h_len - h_i + padding) * skip_cost;
    dp[q_len][h_i][0] = dist;
    dp[q_len][h_i][1] = dist;
  }

  // Fill dp table
  for (let q_i = q_len - 1; q_i >= 0; q_i--) {
    for (let h_i = h_len - 1; h_i >= 0; h_i--) {

      // Deletion
      let del_cost_total = del_cost + dp[q_i + 1][h_i][0]; // after deletion, cm == 0

      // Skipping
      let skip_cost_total = skip_cost + dp[q_i][h_i + 1][0]; // after skip, cm == 0

      let match_cost;
      if (q[q_i] === h[h_i]) {
        // Matching
        // From dp[q_i + 1][h_i + 1][1], since after matching, cm == 1
        match_cost = dp[q_i + 1][h_i + 1][1];
      } else {
        // Subbing
        match_cost = sub_cost + dp[q_i + 1][h_i + 1][0]; // after sub, cm == 0
      }

      dp[q_i][h_i][0] = Math.min(del_cost_total, skip_cost_total, match_cost);

      // Deletion
      let del_cost_cm1 = del_cost + dp[q_i + 1][h_i][1]; // keep a potential streak going

      // Skipping
      let skip_cost_cm1 = skip_cost + dp[q_i][h_i + 1][0]; // after skip, cm resets to 0

      let match_cost_cm1;
      if (q[q_i] === h[h_i]) {
        // Matching
        // From dp[q_i + 1][h_i + 1][1]
        match_cost_cm1 = dp[q_i + 1][h_i + 1][1] - streak_bias;
      } else {
        // Subbing
        match_cost_cm1 = sub_cost + dp[q_i + 1][h_i + 1][0];
      }

      dp[q_i][h_i][1] = Math.min(del_cost_cm1, skip_cost_cm1, match_cost_cm1);
    }
  }

  // The final result is dp[0][0][0], since we start with cm == 0
  return dp[0][0][0];
};

const distances_iterative_levvy =
  content.map(s => {
    return [s, iterativeLevvy(query, s, longest_line - s.length)]
  });

console.timeEnd('my timer');

// const distances_levvy =
//   content.map(s => {
//     const cache = new Map();
//     return [s, referenceLevvy(cache, query, 0, s, 0, longest_line - s.length)]
//   });


(distances_iterative_levvy.map((d,i)=>[i+1,d]).slice().sort(([, [,i_0 ]]: any, [, [,i_1]]: any) => i_1 - i_0)
  .forEach(x => console.log(x)))
