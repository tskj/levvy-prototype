import { iterativeLevvy, iterativeLevvy_fast } from ".";
import { files, getLines, queries } from "./utils";

// Function to calculate the average of an array of numbers
const calculateAverage = (numbers: number[]): number => {
  const total = numbers.reduce((sum, val) => sum + val, 0);
  return total / numbers.length;
};

// Function to calculate the median of an array of numbers
const calculateMedian = (numbers: number[]): number => {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
};

const iterations = 3;

// Initialize data structures to accumulate times
const queryTimesIterative: { [query: string]: number[] } = {};
const queryTimesIterativeFast: { [query: string]: number[] } = {};
const fileTimesIterative: { [file: string]: number[] } = {};
const fileTimesIterativeFast: { [file: string]: number[] } = {};

// Iterate over each file
for (const file of files) {
  const lines = await getLines(file);
  const longest_line = Math.max(...lines.map((l) => l.length));

  // Initialize arrays for the current file if not already present
  if (!fileTimesIterative[file]) {
    fileTimesIterative[file] = [];
    fileTimesIterativeFast[file] = [];
  }

  // Iterate over each query
  for (const query of queries) {
    // Initialize arrays for the current query if not already present
    if (!queryTimesIterative[query]) {
      queryTimesIterative[query] = [];
      queryTimesIterativeFast[query] = [];
    }

    // Initialize variables to accumulate total time over iterations
    let totalIterativeTime = 0;
    let totalIterativeFastTime = 0;

    // Perform benchmarking over the specified number of iterations
    for (let i = 0; i < iterations; i++) {
      // Benchmark iterativeLevvy (Regular Version)
      let startTime = performance.now();
      for (const line of lines) {
        const padding = longest_line - line.length;
        iterativeLevvy(query, line, padding);
      }
      let endTime = performance.now();
      totalIterativeTime += endTime - startTime;

      // Benchmark iterativeLevvy_fast (Fast Version)
      startTime = performance.now();
      const scratch_space = new Array((longest_line + 1) * 2 * 2);
      for (const line of lines) {
        const padding = longest_line - line.length;
        iterativeLevvy_fast(query, line, padding, scratch_space);
      }
      endTime = performance.now();
      totalIterativeFastTime += endTime - startTime;
    }

    // Calculate average time per iteration for both versions
    const avgIterativeTime = totalIterativeTime / iterations;
    const avgIterativeFastTime = totalIterativeFastTime / iterations;

    // Store times for queries
    queryTimesIterative[query].push(avgIterativeTime);
    queryTimesIterativeFast[query].push(avgIterativeFastTime);

    // Store times for files
    fileTimesIterative[file].push(avgIterativeTime);
    fileTimesIterativeFast[file].push(avgIterativeFastTime);
  }
}

// Function to calculate speedup percentage
const calculateSpeedup = (regularTime: number, fastTime: number): number => {
  if (regularTime === 0) return 0;
  return ((regularTime - fastTime) / regularTime) * 100;
};

// Calculate and print average and median times per file
console.log("\n=== Benchmark Results for IterativeLevvy (Regular) ===");
for (const file of files) {
  const iterativeTimes = fileTimesIterative[file];

  const avgIterative = calculateAverage(iterativeTimes);
  const medianIterative = calculateMedian(iterativeTimes);

  console.log(`File: "${file}"`);
  console.log(`IterativeLevvy - Average Time: ${avgIterative.toFixed(6)} ms`);
  console.log(`IterativeLevvy - Median Time: ${medianIterative.toFixed(6)} ms`);
  console.log("----------------------------------------");
}

console.log("\n=== Benchmark Results for IterativeLevvy_fast ===");
for (const file of files) {
  const iterativeFastTimes = fileTimesIterativeFast[file];
  const iterativeTimes = fileTimesIterative[file];

  const avgIterativeFast = calculateAverage(iterativeFastTimes);
  const medianIterativeFast = calculateMedian(iterativeFastTimes);

  // Calculate avgIterative and medianIterative in this scope
  const avgIterative = calculateAverage(iterativeTimes);
  const medianIterative = calculateMedian(iterativeTimes);

  // Calculate speedup
  const avgSpeedup = calculateSpeedup(avgIterative, avgIterativeFast);
  const medianSpeedup = calculateSpeedup(medianIterative, medianIterativeFast);

  console.log(`File: "${file}"`);
  console.log(`IterativeLevvy_fast - Average Time: ${avgIterativeFast.toFixed(6)} ms`);
  console.log(`IterativeLevvy_fast - Median Time: ${medianIterativeFast.toFixed(6)} ms`);
  console.log(`Speedup - Average: ${avgSpeedup.toFixed(2)}% faster`);
  console.log(`Speedup - Median: ${medianSpeedup.toFixed(2)}% faster`);
  console.log("----------------------------------------");
}

