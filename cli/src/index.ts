import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { compareCandidateRank, rankCandidates } from "./rank.js";
import {
  buildReason,
  formatBatchAnalysis,
  formatBatchMarkdownReport,
  formatBatchResults,
  formatCandidates,
  type BatchAnalysisSummary,
  type BatchComparison,
  type BatchReportMetadata,
  type BatchResult
} from "./format.js";
import type { TitleInput } from "./types.js";

async function loadInput(path: string): Promise<TitleInput> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as TitleInput;
}

type BatchBuildResult = {
  results: BatchResult[];
  analysisResults: BatchResult[];
  summary: BatchAnalysisSummary;
  metadata: BatchReportMetadata;
};

type BatchOutputFormat = "text" | "json" | "markdown";

function resolveBatchOutputFormat(formatFlag: string | undefined, outPath?: string): BatchOutputFormat {
  const normalizedFormat = formatFlag?.toLowerCase();
  if (normalizedFormat === "json") return "json";
  if (normalizedFormat === "md" || normalizedFormat === "markdown") return "markdown";
  if (outPath?.toLowerCase().endsWith(".md")) return "markdown";
  return "text";
}

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
  const metadata: BatchReportMetadata = {
    sourceDir: dirPath,
    sampleCount: fileNames.length,
    sampleNames: fileNames
  };

  for (const fileName of fileNames) {
    const input = await loadInput(path.join(dirPath, fileName));
    const { recommended, currentCandidate } = rankCandidates(input);
    const delta = currentCandidate ? recommended.breakdown.total - currentCandidate.breakdown.total : undefined;
    const tieBreakResolution =
      currentCandidate && delta === 0 ? compareCandidateRank(recommended, currentCandidate, input) : 0;
    const comparison: BatchComparison = !currentCandidate
      ? "no-current"
      : delta !== undefined && delta > 0
        ? "better"
        : delta !== undefined && delta < 0
          ? "worse"
          : tieBreakResolution < 0
            ? "better"
            : tieBreakResolution > 0
              ? "worse"
              : "tie";

    const result: BatchResult = {
      sample: fileName,
      recommended,
      reason: buildReason(recommended),
      current: currentCandidate,
      comparison,
      delta,
      tieBreakResolved: tieBreakResolution !== 0
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

  return { results, analysisResults, summary, metadata };
}

async function runSingle(inputPath: string, jsonMode: boolean): Promise<void> {
  const input = await loadInput(inputPath);
  const { candidates, recommended, currentCandidate } = rankCandidates(input);
  const delta = currentCandidate ? recommended.breakdown.total - currentCandidate.breakdown.total : undefined;
  const tieBreakResolution =
    currentCandidate && delta === 0 ? compareCandidateRank(recommended, currentCandidate, input) : 0;
  const comparison: BatchComparison | undefined = !currentCandidate
    ? undefined
    : delta !== undefined && delta > 0
      ? "better"
      : delta !== undefined && delta < 0
        ? "worse"
        : tieBreakResolution < 0
          ? "better"
          : tieBreakResolution > 0
            ? "worse"
            : "tie";

  if (jsonMode) {
    const output = {
      candidates,
      recommended: {
        title: recommended.title,
        reason: buildReason(recommended),
        breakdown: recommended.breakdown
      },
      current: currentCandidate,
      comparison: comparison
        ? {
            comparison,
            delta,
            tieBreakResolved: tieBreakResolution !== 0
          }
        : undefined
    };

    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(
    formatCandidates(candidates, recommended, currentCandidate, comparison
      ? {
          comparison,
          delta,
          tieBreakResolved: tieBreakResolution !== 0
        }
      : undefined)
  );
}

async function runBatch(
  dirPath: string,
  jsonMode: boolean,
  analysisMode: boolean,
  outputFormat: BatchOutputFormat
): Promise<void> {
  const { results, analysisResults, summary, metadata } = await buildBatchResults(dirPath);

  if (jsonMode) {
    if (analysisMode) {
      console.log(JSON.stringify({ metadata, analysis: { summary, flagged: analysisResults } }, null, 2));
      return;
    }

    console.log(JSON.stringify({ metadata, results }, null, 2));
    return;
  }

  if (outputFormat === "markdown") {
    console.log(formatBatchMarkdownReport(summary, results, metadata));
    return;
  }

  if (analysisMode) {
    console.log(formatBatchAnalysis(summary, analysisResults, metadata));
    return;
  }

  console.log(formatBatchResults(results, metadata));
}

async function maybeWriteBatchOutput(
  outPath: string | undefined,
  jsonMode: boolean,
  analysisMode: boolean,
  dirPath: string,
  outputFormat: BatchOutputFormat
): Promise<void> {
  if (!outPath) {
    return;
  }

  const { results, analysisResults, summary, metadata } = await buildBatchResults(dirPath);
  const resolvedOutputFormat = jsonMode
    ? "json"
    : outputFormat === "markdown"
      ? "markdown"
      : "text";
  const output =
    resolvedOutputFormat === "json"
      ? analysisMode
        ? JSON.stringify({ metadata, analysis: { summary, flagged: analysisResults } }, null, 2)
        : JSON.stringify({ metadata, results }, null, 2)
      : resolvedOutputFormat === "markdown"
        ? formatBatchMarkdownReport(summary, results, metadata)
        : analysisMode
          ? formatBatchAnalysis(summary, analysisResults, metadata)
          : formatBatchResults(results, metadata);
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
  const formatFlagIndex = args.indexOf("--format");
  const jsonMode = args.includes("--json");
  const analysisMode = args.includes("--analysis");
  const formatFlag = formatFlagIndex !== -1 && args[formatFlagIndex + 1] ? args[formatFlagIndex + 1] : undefined;

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
    const outputFormat = resolveBatchOutputFormat(formatFlag, outPath);
    await runBatch(dirPath, jsonMode, analysisMode, outputFormat);
    await maybeWriteBatchOutput(outPath, jsonMode, analysisMode, dirPath, outputFormat);
    return;
  }

  console.error("Usage:");
  console.error("  tsx src/index.ts run --input ./samples/file.json [--json]");
  console.error("  tsx src/index.ts batch [--dir ./samples] [--json] [--analysis] [--format md] [--out ./reports/batch.txt]");
  process.exit(1);
}

void main();
