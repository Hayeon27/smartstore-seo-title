import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateCandidates } from "./generate.js";
import {
  buildReason,
  formatBatchAnalysis,
  formatBatchMarkdownReport,
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

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function canonicalForComparison(value: string): string {
  return normalizeForComparison(value).replace(/\s+/g, "");
}

function firstMatchIndex(title: string, terms: Array<string | undefined>): number {
  const normalizedTitle = normalizeForComparison(title);
  let bestIndex = Number.POSITIVE_INFINITY;

  for (const term of terms) {
    const normalizedTerm = term?.trim();
    if (!normalizedTerm) continue;

    const index = normalizedTitle.indexOf(normalizeForComparison(normalizedTerm));
    if (index !== -1 && index < bestIndex) {
      bestIndex = index;
    }
  }

  return Number.isFinite(bestIndex) ? bestIndex : -1;
}

function countMatches(title: string, terms: Array<string | undefined>): number {
  const normalizedTitle = normalizeForComparison(title);
  const seen = new Set<string>();

  for (const term of terms) {
    const normalizedTerm = term?.trim();
    if (!normalizedTerm) continue;

    const canonical = canonicalForComparison(normalizedTerm);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);

    if (normalizedTitle.includes(normalizeForComparison(normalizedTerm))) {
      seen.add(`hit:${canonical}`);
    }
  }

  return Array.from(seen).filter((value) => value.startsWith("hit:")).length;
}

function tokenizeForComparison(title: string): string[] {
  return title
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function punctuationCount(title: string): number {
  const matches = title.match(/[|/\\()[\]{}!?.,:;_+=*~`'"'"]/g);
  return matches?.length ?? 0;
}

function structureTieBreakScore(input: TitleInput, title: string): number {
  const origin = input.origin?.trim();
  const identityTerms = [input.brand, input.manufacturer, input.modelName].map((term) => term?.trim()).filter((term): term is string => Boolean(term));
  const primaryIdentity = identityTerms[0];
  const secondaryIdentity = identityTerms[1];
  const coreTerms = input.coreTerms.slice(0, 4).map((term) => term.trim()).filter(Boolean);
  const differentiators = input.differentiators.slice(0, 3).map((term) => term.trim()).filter(Boolean);
  const contextTerms = input.contextTerms.slice(0, 2).map((term) => term.trim()).filter(Boolean);
  const representativeSpec = input.representativeSpec?.trim();

  const originIndex = firstMatchIndex(title, [origin]);
  const identityIndex = firstMatchIndex(title, [primaryIdentity, secondaryIdentity]);
  const coreIndex = firstMatchIndex(title, coreTerms);
  const differentiatorIndex = firstMatchIndex(title, differentiators);
  const contextIndex = firstMatchIndex(title, contextTerms);
  const specIndex = firstMatchIndex(title, [representativeSpec]);

  let score = 0;

  if (originIndex !== -1) score += 2;
  if (identityIndex !== -1) score += 2;
  if (coreIndex !== -1) score += 3;
  if (differentiatorIndex !== -1) score += 2;
  if (contextIndex !== -1) score += 1;
  if (specIndex !== -1) score += 1;

  const orderedPositions = [originIndex, identityIndex, coreIndex, differentiatorIndex, contextIndex, specIndex].filter(
    (position) => position !== -1
  );

  for (let index = 1; index < orderedPositions.length; index += 1) {
    if (orderedPositions[index] >= orderedPositions[index - 1]) {
      score += 0.5;
    } else {
      score -= 0.75;
    }
  }

  if (originIndex !== -1 && originIndex <= 2) {
    score += 0.5;
  }

  if (identityIndex !== -1 && identityIndex <= 2) {
    score += 0.5;
  }

  if (coreIndex !== -1 && contextIndex !== -1 && coreIndex < contextIndex) {
    score += 0.5;
  } else if (coreIndex !== -1 && contextIndex !== -1 && contextIndex < coreIndex) {
    score -= 0.5;
  }

  if (specIndex !== -1 && specIndex >= title.length - (representativeSpec?.length ?? 0) - 2) {
    score += 0.75;
  }

  return score;
}

function compareTieBreak(a: TitleCandidate, b: TitleCandidate, input: TitleInput): number {
  const aStructure = structureTieBreakScore(input, a.title);
  const bStructure = structureTieBreakScore(input, b.title);
  if (aStructure !== bStructure) {
    return bStructure - aStructure;
  }

  const aContextCount = countMatches(a.title, input.contextTerms.slice(0, 2));
  const bContextCount = countMatches(b.title, input.contextTerms.slice(0, 2));
  if (aContextCount !== bContextCount) {
    return aContextCount - bContextCount;
  }

  if (a.title.length !== b.title.length) {
    return a.title.length - b.title.length;
  }

  const aPunctuationCount = punctuationCount(a.title);
  const bPunctuationCount = punctuationCount(b.title);
  if (aPunctuationCount !== bPunctuationCount) {
    return aPunctuationCount - bPunctuationCount;
  }

  const aTokenCount = tokenizeForComparison(a.title).length;
  const bTokenCount = tokenizeForComparison(b.title).length;
  if (aTokenCount !== bTokenCount) {
    return aTokenCount - bTokenCount;
  }

  return normalizeForComparison(a.title).localeCompare(normalizeForComparison(b.title), "ko");
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
  const recommended = [...candidates].sort((a, b) => {
    const scoreDelta = b.breakdown.total - a.breakdown.total;
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const tieBreakDelta = compareTieBreak(a, b, input);
    if (tieBreakDelta !== 0) {
      return tieBreakDelta;
    }

    return a.title.localeCompare(b.title, "ko");
  })[0];

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

async function runBatch(
  dirPath: string,
  jsonMode: boolean,
  analysisMode: boolean,
  outputFormat: BatchOutputFormat
): Promise<void> {
  const { results, analysisResults, summary } = await buildBatchResults(dirPath);

  if (jsonMode) {
    if (analysisMode) {
      console.log(JSON.stringify({ analysis: { summary, flagged: analysisResults } }, null, 2));
      return;
    }

    console.log(JSON.stringify({ results }, null, 2));
    return;
  }

  if (outputFormat === "markdown") {
    console.log(formatBatchMarkdownReport(summary, results));
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
  dirPath: string,
  outputFormat: BatchOutputFormat
): Promise<void> {
  if (!outPath) {
    return;
  }

  const { results, analysisResults, summary } = await buildBatchResults(dirPath);
  const resolvedOutputFormat = jsonMode
    ? "json"
    : outputFormat === "markdown"
      ? "markdown"
      : "text";
  const output = resolvedOutputFormat === "json"
    ? analysisMode
      ? JSON.stringify({ analysis: { summary, flagged: analysisResults } }, null, 2)
      : JSON.stringify({ results }, null, 2)
    : resolvedOutputFormat === "markdown"
      ? formatBatchMarkdownReport(summary, results)
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
