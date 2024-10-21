const query = "cxoxnxtxixmxe";

const content = await Bun.file("data/test3.txt")
  .text()
  .then(x => x
    .split("\n"));

const longest_line =
    Math.max(...content.map(s => s.length));

console.time('my timer');

const del_cost = 2;
const skip_cost = 2;
const sub_cost = 3;
const streak_bias = 2;

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

export const iterativeLevvy = (q: string, h: string, padding: number): number[] => {
  const q_len = q.length;
  const h_len = h.length;

  const Q = q_len + 1;
  const H = h_len + 1;
  const B = 2;
  const BH = B * H;

  // Initialize dp table
  // dp[q_i][h_i][cm]
  const dp = Array(Q * H * B)
    .fill(Infinity);

  // Base cases
  for (let q_i = 0; q_i <= q_len; q_i++) {
    const dist = (q_len - q_i) * del_cost + padding * skip_cost;
    dp[q_i * BH + h_len * B + 0] = dist;
    dp[q_i * BH + h_len * B + 1] = dist;
  }
  for (let h_i = 0; h_i <= h_len; h_i++) {
    const dist = (h_len - h_i + padding) * skip_cost;
    dp[q_len * BH + h_i * B + 0] = dist;
    dp[q_len * BH + h_i * B + 1] = dist;
  }

  // Fill dp table
  for (let q_i = q_len - 1; q_i >= 0; q_i--) {
    for (let h_i = h_len - 1; h_i >= 0; h_i--) {

      // Deletion
      let del_cost_total = del_cost + dp[(q_i + 1) * BH + h_i * B + 0]; // after deletion, cm == 0

      // Skipping
      let skip_cost_total = skip_cost + dp[q_i * BH + (h_i + 1) * B + 0]; // after skip, cm == 0

      let match_cost;
      if (q[q_i] === h[h_i]) {
        // Matching
        match_cost = dp[(q_i + 1) * BH + (h_i + 1) * B + 1];
      } else {
        // Subbing
        match_cost = sub_cost + dp[(q_i + 1) * BH + (h_i + 1) * B + 0]; // after sub, cm == 0
      }

      dp[q_i * BH + h_i * B + 0] = Math.min(del_cost_total, skip_cost_total, match_cost);

      // Deletion
      let del_cost_cm1 = del_cost + dp[(q_i + 1) * BH + h_i * B + 1]; // keep a potential streak going

      // Skipping
      let skip_cost_cm1 = skip_cost + dp[q_i * BH + (h_i + 1) * B + 0]; // after skip, cm resets to 0

      let match_cost_cm1;
      if (q[q_i] === h[h_i]) {
        // Matching
        match_cost_cm1 = dp[(q_i + 1) * BH + (h_i + 1) * B + 1] - streak_bias;
      } else {
        // Subbing
        match_cost_cm1 = sub_cost + dp[(q_i + 1) * BH + (h_i + 1) * B + 0];
      }

      dp[q_i * BH + h_i * B + 1] = Math.min(del_cost_cm1, skip_cost_cm1, match_cost_cm1);
    }
  }

  return dp;
};

const path = (
  q: string,
  h: string,
  padding: number,
  dp: number[]
): string[] => {
  const q_len = q.length;
  const h_len = h.length;

  const Q = q_len + 1;
  const H = h_len + 1;
  const B = 2;
  const BH = B * H;

  let q_i = 0;
  let h_i = 0;
  let cm = 0; // Start with cm = 0 (no consecutive match)

  const result = [];

  // Ensure cost constants are accessible
  const delCost = del_cost;
  const skipCost = skip_cost;
  const subCost = sub_cost;
  const streakBias = streak_bias;

  while (q_i < q_len || h_i < h_len) {
    // Get current dp value
    const dp_index = q_i * BH + h_i * B + cm;
    const dp_current = dp[dp_index];

    let operations = [];

    // Initialize min_cost to a large number
    let min_cost = Infinity;

    // Deletion
    if (q_i < q_len) {
      const del_cm = cm === 1 ? 1 : 0; // cm may stay the same if cm === 1
      const del_dp_index = (q_i + 1) * BH + h_i * B + del_cm;
      const delTotalCost = delCost + dp[del_dp_index];
      if (delTotalCost <= min_cost) {
        if (delTotalCost < min_cost) operations = [];
        min_cost = delTotalCost;
        operations.push({ op: 'del', q_i: q_i + 1, h_i: h_i, cm: del_cm });
      }
    }

    // Skipping
    if (h_i < h_len) {
      const skip_dp_index = q_i * BH + (h_i + 1) * B + 0; // cm resets to 0
      const skipTotalCost = skipCost + dp[skip_dp_index];
      if (skipTotalCost <= min_cost) {
        if (skipTotalCost < min_cost) operations = [];
        min_cost = skipTotalCost;
        operations.push({ op: 'skip', q_i: q_i, h_i: h_i + 1, cm: 0 });
      }
    }

    // Matching or Substitution
    if (q_i < q_len && h_i < h_len) {
      if (q[q_i] === h[h_i]) {
        // Matching
        const match_cm = 1; // cm becomes 1 after a match
        const match_dp_index = (q_i + 1) * BH + (h_i + 1) * B + match_cm;
        let matchTotalCost = dp[match_dp_index];
        if (cm === 1) matchTotalCost -= streakBias;
        if (matchTotalCost <= min_cost) {
          if (matchTotalCost < min_cost) operations = [];
          min_cost = matchTotalCost;
          operations.push({ op: 'match', q_i: q_i + 1, h_i: h_i + 1, cm: match_cm });
        }
      } else {
        // Substitution
        const sub_dp_index = (q_i + 1) * BH + (h_i + 1) * B + 0; // cm resets to 0
        const subTotalCost = subCost + dp[sub_dp_index];
        if (subTotalCost <= min_cost) {
          if (subTotalCost < min_cost) operations = [];
          min_cost = subTotalCost;
          operations.push({ op: 'sub', q_i: q_i + 1, h_i: h_i + 1, cm: 0 });
        }
      }
    }

    // Choose the operation with the highest priority in case of a tie
    const op_priority = { 'match': 1, 'sub': 2, 'del': 3, 'skip': 4 };
    operations.sort((a, b) => op_priority[a.op] - op_priority[b.op]);

    // Select the operation
    const best_op = operations[0];

    // Update indices and cm
    q_i = best_op.q_i;
    h_i = best_op.h_i;
    cm = best_op.cm;

    // Add operation to result
    result.push(best_op.op);
  }

  return result;
};

const distances_iterative_levvy =
  content.map(s => {
    return [s, iterativeLevvy(query, s, longest_line - s.length)[0], path(query, s, longest_line - s.length, iterativeLevvy(query, s, longest_line - s.length))]
  });

console.timeEnd('my timer');

// const distances_levvy =
//   content.map(s => {
//     const cache = new Map();
//     return [s, referenceLevvy(cache, query, 0, s, 0, longest_line - s.length)]
//   });


(distances_iterative_levvy.map((d,i)=>[i+1,d]).slice().sort(([, [,i_0 ]]: any, [, [,i_1]]: any) => i_1 - i_0)
  .forEach(x => console.log(x)))
