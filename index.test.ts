import { iterativeLevvy, referenceLevvy } from ".";

const queries = [
  ""
  , " "
  , "   "
  , "conxtime"
  , "bunawait"
  , "awaitBun"
  , "awaitbun"
  , "result"
  , "result=[["
  , "cnostla"
  , "contxxxælå"
  , "Mathmin()"
  , "cimkeymapset"
  , "vimkeymapset"
  , "refactiriong"
  , "refactoring"
  , ":refactoring"
  , ":refactoringinginging"
  , ";;"
  , "æøå"
];

const files = [
  "data/test.txt"
  , "data/test2.txt"
  , "data/test3.txt"
]

test('equal reference implementation', async () => {
  const getLines = async (file: string) => await Bun.file(file)
    .text()
    .then(x => x
      .split("\n"));

  for (const file of files) {
    const lines = await getLines(file);
    const longest_line = Math.max(...lines.map(l => l.length));

    for (const query of queries) {
      for (const line of lines) {
        const distances_iterative_levvy = iterativeLevvy(query, line, longest_line - line.length)

        const cache = new Map();
        const distance_reference_levvy = referenceLevvy(cache, query, 0, line, 0, longest_line - line.length);

        expect(distances_iterative_levvy).toBe(distance_reference_levvy);
      }
    }
  }
});
