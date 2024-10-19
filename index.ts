const assert = (assertion: string, p: boolean) => {
  if (!p) {
    throw "assertion failed: " + assertion;
  }
}

const chance_of_missclick = 0.0;
const N = 1_000;
const evidence = "leaderrdp";

const content = await Bun.file("data/test.txt")
  .text()
  .then(x => x
    .split("\n"));

console.time('my timer');

const longest_line =
    Math.max(...content.map(s => s.length));

const paddedContent =
    content.map(s => s.padEnd(longest_line, " "));

const ph = 1 / content.length;

const levenshteinDistance = (s: string) => (t: string): number => {
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

const distances =
  paddedContent.map(s => [s, levenshteinDistance(evidence)(s)]);

console.timeEnd('my timer');

(distances.map((d,i)=>[i+1,d]).slice().sort(([, [,i_0]], [, [,i_1]]) => i_1 - i_0)
  .forEach(x => console.log(x)))

