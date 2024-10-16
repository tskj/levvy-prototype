const N = 1000;
const evidence = "function".split("");

const content = await Bun.file("data/test.txt").text().then(x => x.split("\n"));

console.log(content)
