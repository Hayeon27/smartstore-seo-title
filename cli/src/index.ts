import { readFile } from "node:fs/promises";
import { generateCandidates } from "./generate.js";
import { formatCandidates } from "./format.js";
import { scoreTitle } from "./score.js";
import type { TitleCandidate, TitleInput } from "./types.js";

async function loadInput(path: string): Promise<TitleInput> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as TitleInput;
}

function buildReason(candidate: TitleCandidate): string {
  const b = candidate.breakdown;
  const reasons: string[] = [];

  if (b.C >= 0.75) reasons.push("strong core relevance");
  if (b.D >= 0.75) reasons.push("clear differentiator");
  if (b.B >= 0.75) reasons.push("strong brand/model signal");
  if (b.Q >= 0.75) reasons.push("clean spec placement");
  if (b.X >= 0.75) reasons.push("good context coverage");

  const lowNoise =
    b.R <= 0.5 &&
    b.L <= 0.5 &&
    b.P <= 0.5 &&
    b.T <= 0.5 &&
    b.S <= 0.5 &&
    b.V <= 0.5;

  if (lowNoise) {
    reasons.push("low noise");
  }

  if (reasons.length === 0) {
    return "best overall score after penalties";
  }

  return reasons.slice(0, 3).join(", ");
}

async function main() {
  const args = process.argv.slice(2);
  const inputFlagIndex = args.indexOf("--input");
  const jsonMode = args.includes("--json");

  if (args[0] !== "run" || inputFlagIndex === -1 || !args[inputFlagIndex + 1]) {
    console.error("Usage: tsx src/index.ts run --input ./samples/file.json [--json]");
    process.exit(1);
  }

  const input = await loadInput(args[inputFlagIndex + 1]);
  const titles = generateCandidates(input);
  const candidates: TitleCandidate[] = titles.map((title) => ({
    title,
    breakdown: scoreTitle(title, input)
  }));

  const recommended = [...candidates].sort((a, b) => b.breakdown.total - a.breakdown.total)[0];

  if (jsonMode) {
    const output = {
      candidates,
      recommended: {
        title: recommended.title,
        reason: buildReason(recommended),
        breakdown: recommended.breakdown
      }
    };

    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(formatCandidates(candidates));
}

void main();
