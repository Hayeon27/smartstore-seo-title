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
  lines.push(`Reason: ${buildReason(recommended)}`);

  return lines.join("\n");
}
