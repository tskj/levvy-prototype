const query = "conxtimeE"; // con ti m

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

const cache = new Map<string, [number, string[]]>();

const levvy = (q: string, h: string, padding: number, consecutive_match = false): [number, string[]] => {
  const del_cost = 1;
  const ins_cost = 1;
  const sub_cost = 1;

  const hash = `(${q}):(${h}):(${padding}):(${consecutive_match})`;
  if (cache.has(hash)) {
    return cache.get(hash) ?? (() => {throw "nei"})();
  }

  if (h.length === 0) {
    if (padding > q.length) {
      const dist = q.length * sub_cost + (padding - q.length) * ins_cost;
      const result = [dist, [`change rest of query (${q}) to padding`, `pad with ${padding - q.length} characters`]] as any
      cache.set(hash, result);
      return result;
    } else {
      const dist = padding * sub_cost + (q.length - padding) * del_cost;
      const result = [dist, [`sub ${padding} characters of the remaining query (${q}) to paddding characters`, `delete the remaning query (${q.slice(padding)})`]] as any
      cache.set(hash, result);
      return result;
    }
  }

  if (q.length === 0) {
    const dist = (h.length + padding) * ins_cost;
    const result = [dist, [`insert remaining line: (${h})`, `insert padding (${padding})`]] as any
    cache.set(hash, result);
    return result;
  }

  if (q.slice(0,1) === h.slice(0,1)) {
    let [dist2, exp2] = levvy(q, h.slice(1), padding);
    dist2 += ins_cost;

    let [dist, exp] = levvy(q.slice(1), h.slice(1), padding, true);
    if (consecutive_match) {
      dist -= 0.5;
    }

    let result;
    if (dist2 < dist) result = [dist2, [`even though we match (${q.slice(0,1)}), we ignore and move on`, ...exp2]] as any;
    else result = [dist, [`the two characters are equal: (${q.slice(0,1)})` + (consecutive_match ? ' and we have a streak' : ''), ...exp]] as any

    cache.set(hash, result);
    return result;
  }

  let [del, del_exp] = levvy(q.slice(1), h, padding);
  let [ins, ins_exp] = levvy(q, h.slice(1), padding);
  let [sub, sub_exp] = levvy(q.slice(1), h.slice(1), padding);

  del += del_cost;
  ins += ins_cost;
  sub += sub_cost;

  const least = Math.min(del, ins, sub);
  let result;
  if (del === least) {
    result = [del, [`delete character (${q.slice(0,1)}) from query (${q})`, ...del_exp]] as any
  }
  if (ins === least) {
    result = [ins, [`insert character (${h.slice(0,1)}) to query (${q})`, ...ins_exp]] as any
  }
  if (sub === least) {
    result = [sub, [`substitute character (${q.slice(0,1)}) with (${h.slice(0,1)}) in query (${q})`, ...sub_exp]] as any
  }
  cache.set(hash, result);
  return result;
};

const distances_levvy =
  content.map(s => [s, levvy(query, s, longest_line - s.length)]);

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

(distances_levvy.map((d,i)=>[i+1,d]).slice().sort(([, [,[i_0]]], [, [,[i_1]]]) => i_1 - i_0)
  .forEach(x => console.log(x)))
