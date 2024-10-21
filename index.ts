export const query = "awaitbun";

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
const streak_bias = 3;

const case_setting: 0 | 1 | 2 = 1 as any; // 0 means exact match, 1 means smart and 2 insensitive

export const referenceLevvy = (c: Map<string, number>, q: string, q_i: number, h: string, h_i: number, padding: number, consecutive_match = false): number => {
  const hash = `(${q_i}):(${h_i}):(${consecutive_match})`;
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

  const a = q[q_i];
  const b = h[h_i];
  const is_match = case_setting === 0 ? a === b : (case_setting === 1 ? (a.toLowerCase() === a ? a === b.toLowerCase() : a === b) : a.toLowerCase() === b.toLowerCase());

  if (is_match) {
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

  const H = h_len + 1;
  const B = 2; // consecutive_match flag can be 0 or 1
  const HB = H * B;

  // Initialize dp arrays for two rows
  let dp_current = new Array(HB).fill(Infinity);
  let dp_previous = new Array(HB).fill(Infinity);

  // Base case initialization for q_i = q_len
  for (let h_i = 0; h_i <= h_len; h_i++) {
    const dist = (h_len - h_i + padding) * skip_cost;
    dp_previous[h_i * B + 0] = dist;
    dp_previous[h_i * B + 1] = dist;
  }

  // Main DP loop
  for (let q_i = q_len - 1; q_i >= 0; q_i--) {
    // Initialize dp_current for h_i = h_len
    const dist = (q_len - q_i) * del_cost + padding * skip_cost;
    dp_current[h_len * B + 0] = dist;
    dp_current[h_len * B + 1] = dist;

    for (let h_i = h_len - 1; h_i >= 0; h_i--) {
      const a = q[q_i];
      const b = h[h_i];

      let adjustedA = a;
      let adjustedB = b;

      if (case_setting === 2) {
        adjustedA = a.toLowerCase();
        adjustedB = b.toLowerCase();
      } else if (case_setting === 1 && a === a.toLowerCase()) {
        adjustedB = b.toLowerCase();
      }

      const is_match = adjustedA === adjustedB;

      // Access dp values from dp_previous and dp_current arrays
      const index_current = h_i * B;
      const index_next = (h_i + 1) * B;

      // Deletion (cm == 0)
      let del_cost_total = del_cost + dp_previous[index_current + 0]; // cm remains the same after deletion

      // Skipping (cm == 0)
      let skip_cost_total = skip_cost + dp_current[index_next + 0]; // cm resets to 0 after skipping

      let match_cost;
      if (is_match) {
        // Matching (cm == 1)
        match_cost = dp_previous[index_next + 1];
      } else {
        // Substitution (cm == 0)
        match_cost = sub_cost + dp_previous[index_next + 0];
      }

      dp_current[index_current + 0] = Math.min(del_cost_total, skip_cost_total, match_cost);

      // Deletion (cm == 1)
      let del_cost_cm1 = del_cost + dp_previous[index_current + 1]; // cm remains 1 after deletion

      // Skipping (cm == 1 -> cm resets to 0)
      let skip_cost_cm1 = skip_cost + dp_current[index_next + 0];

      let match_cost_cm1;
      if (is_match) {
        // Matching with streak bias
        match_cost_cm1 = dp_previous[index_next + 1] - streak_bias;
      } else {
        // Substitution resets cm to 0
        match_cost_cm1 = sub_cost + dp_previous[index_next + 0];
      }

      dp_current[index_current + 1] = Math.min(del_cost_cm1, skip_cost_cm1, match_cost_cm1);
    }

    // Swap dp_current and dp_previous for next iteration
    [dp_current, dp_previous] = [dp_previous, dp_current];
  }

  // After the loop, dp_previous contains the final result for q_i = 0
  return dp_previous;
};

export function path(q: string, h: string, padding: number, dp: number[]): [string[], number] {
  // courtesy o1-preview
  const path: string[] = [];
  const q_len = q.length;
  const h_len = h.length;
  const adjusted_h_len = h_len + padding;
  const Q = q_len + 1;
  const H = h_len + 1; // DP table only goes up to h_len
  const B = 2;
  const BH = B * H;

  let q_i = 0;
  let h_i = 0;
  let cm = 0; // consecutive_match: 0 or 1
  let total_cost = 0;

  while (q_i < q_len || h_i < h_len) {
    // For dp indexing, h_i cannot exceed h_len
    const dp_h_i = Math.min(h_i, h_len);
    const index = q_i * BH + dp_h_i * B + cm;
    const current_cost = dp[index];

    const options = [];

    // Deletion (only if q_i < q_len)
    if (q_i < q_len) {
      const next_cm = cm;
      const del_index = (q_i + 1) * BH + dp_h_i * B + next_cm;
      const op_cost = del_cost;
      const cost = op_cost + dp[del_index];

      options.push({
        op: 'delete ' + q[q_i],
        op_cost,
        cost,
        q_i: q_i + 1,
        h_i,
        cm: next_cm,
      });
    }

    // Skipping (only if h_i < h_len)
    if (h_i < h_len) {
      const next_cm = 0;
      const skip_dp_h_i = h_i + 1;
      const skip_index = q_i * BH + skip_dp_h_i * B + next_cm;
      const op_cost = skip_cost;
      const cost = op_cost + dp[skip_index];

      options.push({
        op: 'skip',
        op_cost,
        cost,
        q_i,
        h_i: h_i + 1,
        cm: next_cm,
      });
    }

    // Match or Substitute (only if q_i < q_len and h_i < h_len)
    if (q_i < q_len && h_i < h_len) {

      const a = q[q_i];
      const b = h[h_i];
      const is_match = case_setting === 0 ? a === b : (case_setting === 1 ? (a.toLowerCase() === a ? a === b.toLowerCase() : a === b) : a.toLowerCase() === b.toLowerCase());

      if (is_match) {
        // Matching
        const next_cm = 1;
        const match_index = (q_i + 1) * BH + (h_i + 1) * B + next_cm;
        const op_cost = cm === 1 ? -streak_bias : 0;
        const cost = op_cost + dp[match_index];

        options.push({
          op: 'match ' + q[q_i],
          op_cost,
          cost,
          q_i: q_i + 1,
          h_i: h_i + 1,
          cm: next_cm,
        });
      } else {
        // Substitution
        const next_cm = 0;
        const sub_index = (q_i + 1) * BH + (h_i + 1) * B + next_cm;
        const op_cost = sub_cost;
        const cost = op_cost + dp[sub_index];

        options.push({
          op: 'substitute ' + q[q_i] + ' for ' + h[h_i],
          op_cost,
          cost,
          q_i: q_i + 1,
          h_i: h_i + 1,
          cm: next_cm,
        });
      }
    }

    // Find valid operations matching current cost
    const valid_options = options.filter((option) => option.cost === current_cost);

    if (valid_options.length === 0) {
      // If both strings are fully processed, we're done
      if (q_i >= q_len && h_i >= h_len) {
        break;
      } else {
        throw new Error(`No valid operation at q_i=${q_i}, h_i=${h_i}, cm=${cm}`);
      }
    }

    // Prioritize operations
    const operation_order = ['match', 'substitute', 'delete', 'skip'];
    let chosen_option;
    for (const op_name of operation_order) {
      chosen_option = valid_options.find((option) => option.op.startsWith(op_name));
      if (chosen_option) break;
    }

    if (!chosen_option) {
      throw new Error(`Operation not found at q_i=${q_i}, h_i=${h_i}, cm=${cm}`);
    }

    path.push(chosen_option.op);
    total_cost += chosen_option.op_cost;

    q_i = chosen_option.q_i;
    h_i = chosen_option.h_i;
    cm = chosen_option.cm;
  }

  // After processing both strings, account for any remaining padding cost without adding 'skip' operations
  if (h_i < adjusted_h_len) {
    const remaining_skips = adjusted_h_len - h_i;
    total_cost += remaining_skips * skip_cost;
    // Optionally, you can note that the cost of the remaining skips has been added
    // path.push(`... (${remaining_skips} skips omitted)`);
  }

  return [path, total_cost];
}

const distances_iterative_levvy =
  content.map(s => {
    return [s, iterativeLevvy(query, s, longest_line - s.length)[0]/*, path(query, s, longest_line - s.length, iterativeLevvy(query, s, longest_line - s.length))*/]
  });

console.timeEnd('my timer');

// const distances_levvy =
//   content.map(s => {
//     const cache = new Map();
//     return [s, referenceLevvy(cache, query, 0, s, 0, longest_line - s.length)]
//   });


(distances_iterative_levvy.map((d,i)=>[i+1,d]).slice().sort(([, [,i_0 ]]: any, [, [,i_1]]: any) => i_1 - i_0)
  .forEach(x => console.log(x)))
