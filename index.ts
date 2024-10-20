const query = "conxtime";

const content = await Bun.file("data/test3.txt")
  .text()
  .then(x => x
    .split("\n"));

const longest_line =
    Math.max(...content.map(s => s.length));

console.time('my timer');

let cache = new Map<string, number>();

const levvy = (q: string, q_i: number, h: string, h_i: number, padding: number, consecutive_match = false): number => {
  // const i = cache.get("i") ?? 0;
  // cache.set("i", i + 1);

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

  if (q[q_i] === h[h_i]) {
    let dist2 = levvy(q, q_i, h, h_i + 1, padding);
    dist2 += skip_cost;

    let dist3 = levvy(q, q_i + 1, h, h_i, padding);
    dist3 += del_cost;

    let dist = levvy(q, q_i + 1, h, h_i + 1, padding, true);
    if (consecutive_match) {
      dist -= 0.5;
    }

    let result = dist3;
    if (dist2 < result) result = dist2 as any;
    if (dist < result) result = dist as any

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
    return [s, levvy(query, 0, s, 0, longest_line - s.length), cache.get("i")]
  });

console.timeEnd('my timer');

// (distances_levvy.map((d,i)=>[i+1,d]).slice().sort(([, [,i_0]], [, [,i_1]]) => i_1 - i_0)
//   .forEach(x => console.log(x)))
