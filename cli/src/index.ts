import { readFile } from "node:fs/promises";
import { generateCandidates } from "./generate.js";
import { formatCandidates } from "./format.js";
import { scoreTitle } from "./score.js";
import type { TitleCandidate, TitleInput } from "./types.js";

async function loadInput(path: string): Promise<TitleInput> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as TitleInput;
}

async function main() {
  const args = process.argv.slice(2);
  const inputFlagIndex = args.indexOf("--input");

  if (args[0] !== "run" || inputFlagIndex === -1 || !args[inputFlagIndex + 1]) {
    console.error("Usage: tsx src/index.ts run --input ./samples/file.json");
    process.exit(1);
  }

  const input = await loadInput(args[inputFlagIndex + 1]);
  const titles = generateCandidates(input);
  const candidates: TitleCandidate[] = titles.map((title) => ({
    title,
    breakdown: scoreTitle(title, input)
  }));

  console.log(formatCandidates(candidates));
}

void main();
