import type { TitleCandidate } from "./types.js";

function formatValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/\.00$/, "");
}

function formatBreakdown(candidate: TitleCandidate): string {
  const b = candidate.breakdown;
  return [
    `C=${formatValue(b.C)}`,
    `D=${formatValue(b.D)}`,
    `X=${formatValue(b.X)}`,
    `B=${formatValue(b.B)}`,
    `Q=${formatValue(b.Q)}`,
    `R=${formatValue(b.R)}`,
    `L=${formatValue(b.L)}`,
    `P=${formatValue(b.P)}`,
    `T=${formatValue(b.T)}`,
    `S=${formatValue(b.S)}`,
    `V=${formatValue(b.V)}`
  ].join(" ");
}

export function formatCandidates(candidates: TitleCandidate[]): string {
  const lines: string[] = [];

  candidates.forEach((candidate, index) => {
    lines.push(`Candidate ${index + 1}: ${candidate.title}`);
    lines.push(`Score: ${candidate.breakdown.total}`);
    lines.push(`Breakdown: ${formatBreakdown(candidate)}`);
    lines.push("");
  });

  const recommended = [...candidates].sort((a, b) => b.breakdown.total - a.breakdown.total)[0];
  lines.push("Recommended:");
  lines.push(recommended.title);

  return lines.join("\n");
}
