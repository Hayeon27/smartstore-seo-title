import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateCandidates } from "./generate.js";
import {
  buildReason,
  formatBatchAnalysis,
  formatBatchResults,
  formatCandidates,
  type BatchAnalysisSummary,
  type BatchComparison,
  type BatchResult
} from "./format.js";
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

type BatchBuildResult = {
  results: BatchResult[];
  analysisResults: BatchResult[];
  summary: BatchAnalysisSummary;
};

async function buildBatchResults(dirPath: string): Promise<BatchBuildResult> {
  const fileNames = (await readdir(dirPath))
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const results: BatchResult[] = [];
  const analysisResults: BatchResult[] = [];
  const summary: BatchAnalysisSummary = {
    total: fileNames.length,
    compared: 0,
    better: 0,
    tie: 0,
    worse: 0,
    flagged: 0
  };

  for (const fileName of fileNames) {
    const input = await loadInput(path.join(dirPath, fileName));
    const { recommended, currentCandidate } = rankCandidates(input);
    const delta = currentCandidate ? recommended.breakdown.total - currentCandidate.breakdown.total : undefined;
    const comparison: BatchComparison = !currentCandidate
      ? "no-current"
      : delta !== undefined && delta > 0
        ? "better"
        : delta !== undefined && delta < 0
          ? "worse"
          : "tie";

    const result: BatchResult = {
      sample: fileName,
      recommended,
      reason: buildReason(recommended),
      current: currentCandidate,
      comparison,
      delta
    };

    results.push(result);

    if (currentCandidate) {
      summary.compared += 1;
      if (comparison === "better") {
        summary.better += 1;
      } else if (comparison === "tie") {
        summary.tie += 1;
        analysisResults.push(result);
      } else if (comparison === "worse") {
        summary.worse += 1;
        analysisResults.push(result);
      }
    }
  }

  summary.flagged = analysisResults.length;

  return { results, analysisResults, summary };
}

async function runBatch(dirPath: string, jsonMode: boolean, analysisMode: boolean): Promise<void> {
  const { results, analysisResults, summary } = await buildBatchResults(dirPath);

  if (jsonMode) {
    if (analysisMode) {
      console.log(JSON.stringify({ analysis: { summary, flagged: analysisResults } }, null, 2));
      return;
    }

    console.log(JSON.stringify({ results }, null, 2));
    return;
  }

  if (analysisMode) {
    console.log(formatBatchAnalysis(summary, analysisResults));
    return;
  }

  console.log(formatBatchResults(results));
}

async function maybeWriteBatchOutput(
  outPath: string | undefined,
  jsonMode: boolean,
  analysisMode: boolean,
  dirPath: string
): Promise<void> {
  if (!outPath) {
    return;
  }

  const { results, analysisResults, summary } = await buildBatchResults(dirPath);
  const output = jsonMode
    ? analysisMode
      ? JSON.stringify({ analysis: { summary, flagged: analysisResults } }, null, 2)
      : JSON.stringify({ results }, null, 2)
    : analysisMode
      ? formatBatchAnalysis(summary, analysisResults)
      : formatBatchResults(results);
  const resolvedPath = path.resolve(outPath);

  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, output, "utf8");
  console.log(`Wrote batch output to ${resolvedPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const inputFlagIndex = args.indexOf("--input");
  const dirFlagIndex = args.indexOf("--dir");
  const outFlagIndex = args.indexOf("--out");
  const jsonMode = args.includes("--json");
  const analysisMode = args.includes("--analysis");

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
    const outPath = outFlagIndex !== -1 && args[outFlagIndex + 1] ? args[outFlagIndex + 1] : undefined;
    await runBatch(dirPath, jsonMode, analysisMode);
    await maybeWriteBatchOutput(outPath, jsonMode, analysisMode, dirPath);
    return;
  }

  console.error("Usage:");
  console.error("  tsx src/index.ts run --input ./samples/file.json [--json]");
  console.error("  tsx src/index.ts batch [--dir ./samples] [--json] [--analysis] [--out ./reports/batch.txt]");
  process.exit(1);
}

void main();
