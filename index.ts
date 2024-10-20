const query = "conxtim";

const content = await Bun.file("data/test3.txt")
  .text()
  .then(x => x
    .split("\n"));

console.time('my timer');

const longest_line =
    Math.max(...content.map(s => s.length));

const paddedContent =
    content.map(s => s.padEnd(longest_line, " "));

function levenshteinDistance(s: string, t: string) {
    // If either string is empty, return the length of the other string
    if (!s.length) return t.length;
    if (!t.length) return s.length;

    const m = s.length;
    const n = t.length;
    let v0 = new Array(n + 1);
    let v1 = new Array(n + 1);

    // Initialize the first row of distances
    for (let i = 0; i <= n; i++) {
        v0[i] = i;
    }

    for (let i = 0; i < m; i++) {
        v1[0] = i + 1;

        for (let j = 0; j < n; j++) {
            const cost = s[i] === t[j] ? 0 : 1;

            v1[j + 1] = Math.min(
                v1[j] + 1,        // Deletion
                v0[j + 1] + 1,    // Insertion
                v0[j] + cost      // Substitution
            );
        }

        // Copy current row distances to previous row for next iteration
        [v0, v1] = [v1, v0];
    }

    return v0[n];
}

let cache = new Map<string, number>();

const levvy = (q: string, q_i: number, h: string, h_i: number, padding: number, consecutive_match = false): number => {
  const del_cost = 1;
  const skip_cost = 1;

  const hash = `(${q_i}):(${h_i}):(${padding}):(${consecutive_match})`;
  if (cache.has(hash)) {
    return cache.get(hash) ?? (() => {throw "nei"})();
  }

  const h_len = h.length - h_i;
  const q_len = q.length - q_i;

  if (h_len === 0) {
    const dist = q_len * del_cost + padding * skip_cost;
    const result = dist as any
    cache.set(hash, result);
    return result;
  }

  if (q_len === 0) {
    const dist = (h_len + padding) * skip_cost;
    const result = dist as any
    cache.set(hash, result);
    return result;
  }

  if (q.at(q_i) === h.at(h_i)) {
    let dist2 = levvy(q, q_i, h, h_i + 1, padding);
    dist2 += skip_cost;

    let dist = levvy(q, q_i + 1, h, h_i + 1, padding, true);
    if (consecutive_match) {
      dist -= 0.5;
    }

    let result;
    if (dist2 < dist) result = dist2 as any;
    else result = dist as any

    cache.set(hash, result);
    return result;
  }

  let del = levvy(q, q_i + 1, h, h_i, padding);
  let skip = levvy(q, q_i, h, h_i + 1, padding);

  del += del_cost;
  skip += skip_cost;

  const least = Math.min(del, skip);
  let result;
  if (del === least) {
    result = del as any
  }
  if (skip === least) {
    result = skip as any
  }
  cache.set(hash, result);
  return result;
};

const distances_levvy =
  content.map(s => {
    cache = new Map();
    return [s, levvy(query, 0, s, 0, longest_line - s.length)]
  });

console.timeEnd('my timer');

const distances =
  paddedContent.map(s => [s, levenshteinDistance(query, s)]);

/*

// ASSERTS:
if (distances.length !== distances_levvy.length) throw "different #n";
for (let i = 0; i < distances.length; i++) {
  if (distances[i][1] !== distances_levvy[i][1] || distances[i][0] !== (distances_levvy[i][0] as string).padEnd(longest_line, " ")) {
    if (distances[i][1] === distances_levvy[i][1]) console.log("not the same line");
    console.log(
      `Difference at line ${i + 1}:`,
      `\nString: ${JSON.stringify(distances[i][0])}`,
      `\nlevenshteinDistance: ${distances[i][1]}`,
      `\nlevvy: ${distances_levvy[i][1]}`
    );
    throw "";
  }
}

*/

(distances_levvy.map((d,i)=>[i+1,d]).slice().sort(([, [,i_0]], [, [,i_1]]) => i_1 - i_0)
  .forEach(x => console.log(x)))
