/*
 * scratch playground: score every line of a data file against a query
 * and reconstruct the match paths -- run with `bun run index.ts`
 *
 * the algorithm itself lives in levvy.ts
 */
import { iterativeLevvy, path } from "./levvy";

export const query = "awaitbun";

const content = await Bun.file("data/test3.txt")
  .text()
  .then(x => x
    .split("\n"));

const longest_line =
    Math.max(...content.map(s => s.length));

console.time('my timer');

const distances_iterative_levvy =
  content.map(s => {
    const dp = new Array((s.length + 1) + (query.length + 1) * 2);
    iterativeLevvy(query, s, longest_line - s.length, dp);
    return [s, dp[0], path(query, s, longest_line - s.length, dp)]
  });

console.timeEnd('my timer');

(distances_iterative_levvy.map((d, i) => [i + 1, d]).slice().sort(([, [, i_0]]: any, [, [, i_1]]: any) => i_1 - i_0)
  .slice(0, 0) // bump to taste to print the top ranked lines
  .forEach(x => console.log(x)))
