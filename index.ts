const assert = (assertion: string, p: boolean) => {
  if (!p) {
    throw "assertion failed: " + assertion;
  }
}

const chance_of_missclick = 0.0;
const N = 1_000;
const evidence = "refactoring".split("");

const content = await Bun.file("data/test.txt")
  .text()
  .then(x => x
    .split("\n")
    .map(y => y.split("")));

const ph = 1 / content.length;

function getRandomSampleInOrder(arr: string[], l: number) {
  // Step 1: Create an array of indices to shuffle
  const indices = Array.from({ length: arr.length }, (_, i) => i);

  // Step 2: Fisher-Yates shuffle on the indices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]; // Swap elements
  }

  // Step 3: Pick the first `l` shuffled indices and sort them to maintain original order
  const selectedIndices = indices.slice(0, l).sort((a, b) => a - b);

  // Step 4: Return the elements from the original array at these selected indices
  return selectedIndices.map(i => arr[i]);
}

const sample = (line: string[]): string[][] => {
  if (line.length < evidence.length) {
    return Array(N).fill(line);
  }

  const samples: string[][] = [];
  for (let i = 0; i < N; i++) {
    samples.push(getRandomSampleInOrder(line, evidence.length));
  }
  return samples;
};

const samples =
  content.map(sample);

function transpose(matrix: string[][]) {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}

const count_frequencies = (letters: string[]): Map<string, number> => {
  const m = new Map();

  for (const l of letters) {
    assert("l is letter", l.length === 1);
    const frequency = m.get(l) ?? 0;
    m.set(l, frequency + 1);
  }

  return m;
};

const freqs =
  samples.map(s => {
     const inverted = transpose(s);
     return inverted.map(count_frequencies);
  });

const pehs =
  freqs.map(line => {
    if (line.length !== evidence.length) {
      return 0;
    }
    let probability = 1;
    for (let i = 0; i < line.length; i++) {
      const f = line[i].get(evidence[i]) ?? chance_of_missclick;
      const peh = f / N;
      probability *= peh;
    }
    return probability;
  });

const joint_probs =
  pehs.map(likelihood => ph * likelihood);

const marginal =
  joint_probs.reduce((a,b) => a+b, 0);

const posteriors =
  joint_probs.map(p => p / marginal);

console.log(pehs[pehs.length - 3]);
console.log(joint_probs[joint_probs.length - 3]);
console.log(marginal);
console.log(posteriors.map(x => x * 1000).flatMap((x, i) => x < 1 ? [] : [[i+1, x]]));
console.log(posteriors.reduce((a,b) => a+b, 0));
