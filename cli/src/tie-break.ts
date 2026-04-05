import type { TitleCandidate, TitleInput } from "./types.js";

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

  if (coreIndex !== -1 && differentiatorIndex !== -1) {
    if (differentiatorIndex < coreIndex) {
      score += 1;
    } else if (coreIndex < differentiatorIndex) {
      score -= 0.5;
    }
  }

  if (specIndex !== -1 && specIndex >= title.length - (representativeSpec?.length ?? 0) - 2) {
    score += 0.75;
  }

  return score;
}

export function compareTitlesForTieBreak(a: TitleCandidate, b: TitleCandidate, input: TitleInput): number {
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
