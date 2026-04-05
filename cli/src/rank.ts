import { generateCandidates } from "./generate.js";
import { scoreTitle } from "./score.js";
import { compareTitlesForTieBreak } from "./tie-break.js";
import type { TitleCandidate, TitleInput } from "./types.js";

export function compareCandidateRank(a: TitleCandidate, b: TitleCandidate, input: TitleInput): number {
  const scoreDelta = b.breakdown.total - a.breakdown.total;
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const tieBreakDelta = compareTitlesForTieBreak(a, b, input);
  if (tieBreakDelta !== 0) {
    return tieBreakDelta;
  }

  return a.title.localeCompare(b.title, "ko");
}

export function rankCandidates(input: TitleInput): {
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
  const recommended = [...candidates].sort((a, b) => compareCandidateRank(a, b, input))[0];

  return { candidates, recommended, currentCandidate };
}
