import { iterativeLevvy, iterativeLevvy_fast, path, referenceLevvy } from ".";
import { files, getLines, queries } from "./utils";

test('equal reference implementation', async () => {
  for (const file of files) {
    const lines = await getLines(file);
    const longest_line = Math.max(...lines.map(l => l.length));
    const curr = new Array((longest_line + 1) * 2);
    const prev = new Array((longest_line + 1) * 2);

    for (const query of queries) {
      for (const line of lines) {
        const distances_iterative_levvy = iterativeLevvy(query, line, longest_line - line.length);
        const distances_iterative_levvy_fast = iterativeLevvy_fast(query, line, longest_line - line.length, curr, prev);

        const cache = new Map();
        const distance_reference_levvy = referenceLevvy(cache, query, 0, line, 0, longest_line - line.length);

        const reconstructed_path = path(query, line, longest_line - line.length, distances_iterative_levvy)

        expect(distances_iterative_levvy[0]).toBe(distance_reference_levvy);
        expect(distances_iterative_levvy_fast).toBe(distance_reference_levvy);
        expect(reconstructed_path[1]).toBe(distance_reference_levvy);
      }
    }
  }
});

