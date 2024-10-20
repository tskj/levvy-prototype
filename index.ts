const query = "evipad";

const content = await Bun.file("data/test2.txt")
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

const cache = new Map<string, number>();

const levvy = (q: string, h: string, padding: number, consecutive_match = false): number => {
  const del_cost = 1;
  const ins_cost = consecutive_match ? 1 : 1;
  const sub_cost = 1;

  const hash = `(${q}):(${h}):(${padding})`;
  if (cache.has(hash)) {
    return cache.get(hash) ?? (() => {throw "nei"})();
  }

  if (h.length === 0) {
    if (padding > q.length) {
      const result = q.length * sub_cost + (padding - q.length) * ins_cost;
      cache.set(hash, result);
      return result;
    } else {
      const result = padding * sub_cost + (q.length - padding) * del_cost;
      cache.set(hash, result);
      return result;
    }
  }

  if (q.length === 0) {
    const result = (h.length + padding) * ins_cost;
    cache.set(hash, result);
    return result;
  }

  if (q.slice(0,1) === h.slice(0,1)) {
    const result = levvy(q.slice(1), h.slice(1), padding, true);
    cache.set(hash, result);
    return result;
  }

  const del = del_cost + levvy(q.slice(1), h, padding);
  const ins = ins_cost + levvy(q, h.slice(1), padding);
  const sub = sub_cost + levvy(q.slice(1), h.slice(1), padding);

  const result = Math.min(del, ins, sub);
  cache.set(hash, result);
  return result;
};

const distances =
  paddedContent.map(s => [s, levenshteinDistance(query, s)]);

console.timeEnd('my timer');

const distances_levvy =
  content.map(s => [s, levvy(query, s, longest_line - s.length)]);

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

(distances_levvy.map((d,i)=>[i+1,d]).slice().sort(([, [,i_0]], [, [,i_1]]) => i_1 - i_0)
  .forEach(x => console.log(x)))
