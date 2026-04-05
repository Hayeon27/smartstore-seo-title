import type { TitleInput } from "./types.js";

function normalizePart(part: string | undefined): string | undefined {
  const trimmed = part?.trim();
  return trimmed ? trimmed : undefined;
}

function compact(parts: Array<string | undefined>): string {
  const seen = new Set<string>();

  return parts
    .map(normalizePart)
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      if (seen.has(part)) {
        return false;
      }

      seen.add(part);
      return true;
    })
    .join(" ");
}

function pickTerms(input: TitleInput): {
  origin?: string;
  identityTerms: string[];
  core: string[];
  differentiators: string[];
  contextTerms: string[];
  representativeSpec?: string;
} {
  const identityTerms = [input.brand, input.manufacturer, input.modelName]
    .map(normalizePart)
    .filter((term): term is string => Boolean(term))
    .filter((term, index, terms) => terms.indexOf(term) === index);

  const core = input.coreTerms.slice(0, 4).map((term) => term.trim()).filter(Boolean);
  const differentiators = input.differentiators.slice(0, 2).map((term) => term.trim()).filter(Boolean);
  const contextTerms = input.contextTerms.slice(0, 2).map((term) => term.trim()).filter(Boolean);

  return {
    origin: normalizePart(input.origin),
    identityTerms,
    core: core.length > 0 ? core : input.productType ? [input.productType.trim()] : [],
    differentiators,
    contextTerms,
    representativeSpec: normalizePart(input.representativeSpec)
  };
}

export function generateCandidates(input: TitleInput): string[] {
  const { origin, identityTerms, core, differentiators, contextTerms, representativeSpec } =
    pickTerms(input);
  const identityA = identityTerms[0];
  const identityB = identityTerms[1];
  const identityC = identityTerms[2];
  const coreText = core.join(" ");
  const diffText = differentiators.join(" ");
  const ctxText = contextTerms.join(" ");

  const rawCandidates = [
    compact([origin, identityA, identityB, identityC, coreText, diffText || undefined, ctxText || undefined, representativeSpec]),
    compact([coreText, diffText || undefined, origin, identityA, identityB, identityC, representativeSpec, ctxText || undefined]),
    compact([coreText, ctxText || undefined, diffText || undefined, origin, identityA, identityB, identityC, representativeSpec]),
    compact([origin, coreText, identityA, ctxText || undefined, diffText || undefined, identityB, representativeSpec])
  ];

  const uniqueCandidates = Array.from(new Set(rawCandidates.filter(Boolean)));

  if (uniqueCandidates.length >= 3) {
    return uniqueCandidates.slice(0, 3);
  }

  const fallback = compact([coreText, diffText || undefined, ctxText || undefined, origin, identityA, identityB, identityC, representativeSpec]);
  if (fallback && !uniqueCandidates.includes(fallback)) {
    uniqueCandidates.push(fallback);
  }

  return uniqueCandidates.slice(0, 3);
}
