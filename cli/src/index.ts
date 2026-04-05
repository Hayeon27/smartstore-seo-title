import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { generateCandidates } from "./generate.js";
import { buildReason, formatBatchResults, formatCandidates } from "./format.js";
import { scoreTitle } from "./score.js";
import type { TitleCandidate, TitleInput } from "./types.js";

async function loadInput(path: string): Promise<TitleInput> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as TitleInput;
}

function rankCandidates(input: TitleInput): {
  candidates: TitleCandidate[];
  recommended: TitleCandidate;
  currentCandidate?: TitleCandidate;
} {
  const titles = generateCandidates(input);
  const candidates: TitleCandidate[] = titles.map((title) => ({
    title,
    breakdown: scoreTitle(title, input)
  }));
  const currentCandidate = input.currentTitle
    ? {
        title: input.currentTitle,
        breakdown: scoreTitle(input.currentTitle, input)
      }
    : undefined;
  const recommended = [...candidates].sort((a, b) => b.breakdown.total - a.breakdown.total)[0];

  return { candidates, recommended, currentCandidate };
}

async function runSingle(inputPath: string, jsonMode: boolean): Promise<void> {
  const input = await loadInput(inputPath);
  const { candidates, recommended, currentCandidate } = rankCandidates(input);

  if (jsonMode) {
    const output = {
      candidates,
      recommended: {
        title: recommended.title,
        reason: buildReason(recommended),
        breakdown: recommended.breakdown
      },
      current: currentCandidate
    };

    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(formatCandidates(candidates, currentCandidate));
}

async function runBatch(dirPath: string, jsonMode: boolean): Promise<void> {
  const fileNames = (await readdir(dirPath))
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const results = [];

  for (const fileName of fileNames) {
    const input = await loadInput(path.join(dirPath, fileName));
    const { recommended, currentCandidate } = rankCandidates(input);

    results.push({
      sample: fileName,
      recommended,
      reason: buildReason(recommended),
      current: currentCandidate
    });
  }

  if (jsonMode) {
    console.log(JSON.stringify({ results }, null, 2));
    return;
  }

  console.log(formatBatchResults(results));
}

async function main() {
  const args = process.argv.slice(2);
  const inputFlagIndex = args.indexOf("--input");
  const dirFlagIndex = args.indexOf("--dir");
  const jsonMode = args.includes("--json");

  if (args[0] === "run") {
    if (inputFlagIndex === -1 || !args[inputFlagIndex + 1]) {
      console.error("Usage: tsx src/index.ts run --input ./samples/file.json [--json]");
      process.exit(1);
    }

    await runSingle(args[inputFlagIndex + 1], jsonMode);
    return;
  }

  if (args[0] === "batch") {
    const dirPath = dirFlagIndex !== -1 && args[dirFlagIndex + 1] ? args[dirFlagIndex + 1] : "./samples";
    await runBatch(dirPath, jsonMode);
    return;
  }

  console.error("Usage:");
  console.error("  tsx src/index.ts run --input ./samples/file.json [--json]");
  console.error("  tsx src/index.ts batch [--dir ./samples] [--json]");
  process.exit(1);
}

void main();
