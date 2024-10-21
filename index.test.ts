import { iterativeLevvy, path, query, referenceLevvy } from ".";

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
  , query
];

const files = [
  "data/test.txt"
  , "data/test2.txt"
  , "data/test3.txt"
]

const getLines = async (file: string): Promise<string[]> => {
  return await Bun.file(file)
    .text()
    .then((x) => x.split("\n"));
};

test('equal reference implementation', async () => {
  for (const file of files) {
    const lines = await getLines(file);
    const longest_line = Math.max(...lines.map(l => l.length));

    for (const query of queries) {
      for (const line of lines) {
        const distances_iterative_levvy = iterativeLevvy(query, line, longest_line - line.length)

        const cache = new Map();
        const distance_reference_levvy = referenceLevvy(cache, query, 0, line, 0, longest_line - line.length);

        const reconstructed_path = path(query, line, longest_line - line.length, distances_iterative_levvy)

        expect(distances_iterative_levvy[0]).toBe(distance_reference_levvy);
        expect(reconstructed_path[1]).toBe(distance_reference_levvy);
      }
    }
  }
});

const calculateAverage = (numbers: number[]): number => {
  const total = numbers.reduce((sum, val) => sum + val, 0);
  return total / numbers.length;
};

const calculateMedian = (numbers: number[]): number => {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
};

test("Benchmark iterativeLevvy vs referenceLevvy over lines in files", async () => {
  const iterations = 3;

  // Initialize data structures to accumulate times
  const queryTimesIterative: { [query: string]: number[] } = {};
  const queryTimesReference: { [query: string]: number[] } = {};
  const fileTimesIterative: { [file: string]: number[] } = {};
  const fileTimesReference: { [file: string]: number[] } = {};

  for (const file of files) {
    const lines = await getLines(file);
    const longest_line = Math.max(...lines.map((l) => l.length));

    // Initialize arrays for the current file if not already
    if (!fileTimesIterative[file]) {
      fileTimesIterative[file] = [];
      fileTimesReference[file] = [];
    }

    for (const query of queries) {
      // Initialize arrays for the current query if not already
      if (!queryTimesIterative[query]) {
        queryTimesIterative[query] = [];
        queryTimesReference[query] = [];
      }

      // We'll measure the time it takes to process all lines per iteration
      let totalIterativeTime = 0;
      let totalReferenceTime = 0;

      for (let i = 0; i < iterations; i++) {
        // Benchmark iterativeLevvy over all lines
        let startTime = performance.now();
        for (const line of lines) {
          const padding = longest_line - line.length;
          iterativeLevvy(query, line, padding);
        }
        let endTime = performance.now();
        totalIterativeTime += endTime - startTime;

        // Benchmark referenceLevvy over all lines
        startTime = performance.now();
        for (const line of lines) {
          const cache = new Map();
          const padding = longest_line - line.length;
          referenceLevvy(cache, query, 0, line, 0, padding);
        }
        endTime = performance.now();
        totalReferenceTime += endTime - startTime;
      }

      // Calculate average time per iteration
      const avgIterativeTime = totalIterativeTime / iterations;
      const avgReferenceTime = totalReferenceTime / iterations;

      // Store times for calculating averages and medians later
      queryTimesIterative[query].push(avgIterativeTime);
      queryTimesReference[query].push(avgReferenceTime);

      fileTimesIterative[file].push(avgIterativeTime);
      fileTimesReference[file].push(avgReferenceTime);
    }
  }

  // Calculate and print average and median times per query
  console.log("\n=== Benchmark Results Per Query ===");
  for (const query of queries) {
    const iterativeTimes = queryTimesIterative[query];
    const referenceTimes = queryTimesReference[query];

    const avgIterative = calculateAverage(iterativeTimes);
    const medianIterative = calculateMedian(iterativeTimes);

    const avgReference = calculateAverage(referenceTimes);
    const medianReference = calculateMedian(referenceTimes);

    console.log(`Query: "${query}"`);
    console.log(`IterativeLevvy - Average Time: ${avgIterative.toFixed(6)} ms`);
    console.log(`IterativeLevvy - Median Time: ${medianIterative.toFixed(6)} ms`);
    console.log(`ReferenceLevvy - Average Time: ${avgReference.toFixed(6)} ms`);
    console.log(`ReferenceLevvy - Median Time: ${medianReference.toFixed(6)} ms`);
    console.log("----------------------------------------");
  }

  // Calculate and print average and median times per file
  console.log("\n=== Benchmark Results Per File ===");
  for (const file of files) {
    const iterativeTimes = fileTimesIterative[file];
    const referenceTimes = fileTimesReference[file];

    const avgIterative = calculateAverage(iterativeTimes);
    const medianIterative = calculateMedian(iterativeTimes);

    const avgReference = calculateAverage(referenceTimes);
    const medianReference = calculateMedian(referenceTimes);

    console.log(`File: "${file}"`);
    console.log(`IterativeLevvy - Average Time: ${avgIterative.toFixed(6)} ms`);
    console.log(`IterativeLevvy - Median Time: ${medianIterative.toFixed(6)} ms`);
    console.log(`ReferenceLevvy - Average Time: ${avgReference.toFixed(6)} ms`);
    console.log(`ReferenceLevvy - Median Time: ${medianReference.toFixed(6)} ms`);
    console.log("----------------------------------------");
  }
});

