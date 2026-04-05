import type { TitleCandidate } from "./types.js";

export function formatCandidates(candidates: TitleCandidate[]): string {
  const lines: string[] = [];

  candidates.forEach((candidate, index) => {
    lines.push(`Candidate ${index + 1}: ${candidate.title}`);
    lines.push(`Score: ${candidate.breakdown.total}`);
    lines.push("");
  });

  const recommended = [...candidates].sort((a, b) => b.breakdown.total - a.breakdown.total)[0];
  lines.push("Recommended:");
  lines.push(recommended.title);

  return lines.join("\n");
}
