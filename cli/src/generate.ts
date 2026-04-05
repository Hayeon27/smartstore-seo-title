import type { TitleInput } from "./types.js";

function normalizePart(part: string | undefined): string | undefined {
  const trimmed = part?.trim();
  return trimmed ? trimmed : undefined;
}

function canonical(part: string): string {
  return part.toLowerCase().replace(/\s+/g, "");
}

function compact(parts: Array<string | undefined>): string {
  const seen = new Set<string>();

  return parts
    .map(normalizePart)
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const key = canonical(part);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .join(" ");
}

function compactList(parts: Array<string | undefined>): string[] {
  const seen = new Set<string>();

  return parts
    .map(normalizePart)
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const key = canonical(part);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function overlapsWithIdentity(term: string, identityTerms: string[]): boolean {
  const key = canonical(term);
  return identityTerms.some((identity) => {
    const identityKey = canonical(identity);
    return key === identityKey || key.includes(identityKey) || identityKey.includes(key);
  });
}

function pickTerms(input: TitleInput): {
  origin?: string;
  primaryIdentity?: string;
  secondaryIdentity?: string;
  core: string[];
  differentiators: string[];
  contextTerms: string[];
  representativeSpec?: string;
} {
  const identityTerms = compactList([input.brand, input.manufacturer, input.modelName]);
  const primaryIdentity = identityTerms[0];
  const secondaryIdentity = identityTerms[1];

  const rawCore = compactList(input.coreTerms.slice(0, 4).map((term) => term.trim()));
  const core = rawCore.filter((term) => !overlapsWithIdentity(term, identityTerms));

  const differentiators = compactList(input.differentiators.slice(0, 3).map((term) => term.trim()));
  const contextTerms = compactList(input.contextTerms.slice(0, 2).map((term) => term.trim()));

  return {
    origin: normalizePart(input.origin),
    primaryIdentity,
    secondaryIdentity,
    core: core.length > 0 ? core : input.productType ? [input.productType.trim()] : [],
    differentiators,
    contextTerms,
    representativeSpec: normalizePart(input.representativeSpec)
  };
}

function buildCandidate(...parts: Array<string | undefined>): string {
  return compact(parts);
}

export function generateCandidates(input: TitleInput): string[] {
  const { origin, primaryIdentity, secondaryIdentity, core, differentiators, contextTerms, representativeSpec } =
    pickTerms(input);

  const coreText = core.join(" ");
  const diffText = differentiators.join(" ");
  const ctxText = contextTerms.join(" ");

  const rawCandidates = [
    buildCandidate(origin, primaryIdentity, coreText, diffText || undefined, ctxText || undefined, secondaryIdentity, representativeSpec),
    buildCandidate(origin, primaryIdentity, coreText, diffText || undefined, secondaryIdentity, ctxText || undefined, representativeSpec),
    buildCandidate(primaryIdentity, coreText, diffText || undefined, secondaryIdentity, ctxText || undefined, representativeSpec),
    buildCandidate(origin, coreText, diffText || undefined, primaryIdentity, secondaryIdentity, ctxText || undefined, representativeSpec),
    buildCandidate(coreText, diffText || undefined, primaryIdentity, secondaryIdentity, ctxText || undefined, representativeSpec)
  ];

  const uniqueCandidates = Array.from(new Set(rawCandidates.filter(Boolean)));

  if (uniqueCandidates.length >= 3) {
    return uniqueCandidates.slice(0, 3);
  }

  const fallback = buildCandidate(origin, primaryIdentity, secondaryIdentity, coreText, diffText || undefined, ctxText || undefined, representativeSpec);
  if (fallback && !uniqueCandidates.includes(fallback)) {
    uniqueCandidates.push(fallback);
  }

  return uniqueCandidates.slice(0, 3);
}
