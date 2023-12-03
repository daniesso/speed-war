import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function main() {
  let firstWords = "";

  rl.on("line", (line) => {
    const words = line.trim().split(" ");
    if (words.length > 0) {
      firstWords += `${words[0]} `;
    }
  });

  rl.on("close", () => {
    console.log(firstWords.trim());
  });
}

main();
