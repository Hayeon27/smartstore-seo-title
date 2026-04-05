import type { TitleInput } from "./types.js";

type GenerateCandidatesOptions = {
  includeCurrentTitle?: boolean;
};

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

function createCoreVariants(coreTerms: string[]): string[] {
  const variants = new Set<string>();
  const base = compact(coreTerms);

  if (base) {
    variants.add(base);
  }

  if (coreTerms.length === 2) {
    const reversed = compact([coreTerms[1], coreTerms[0]]);
    if (reversed) {
      variants.add(reversed);
    }
  }

  return Array.from(variants);
}

function prefersAlternateCoreOrder(
  currentTitle: string | undefined,
  canonicalCore: string | undefined,
  alternateCore: string | undefined
): boolean {
  const normalizedCurrent = normalizePart(currentTitle);
  const normalizedCanonical = normalizePart(canonicalCore);
  const normalizedAlternate = normalizePart(alternateCore);

  if (!normalizedCurrent || !normalizedCanonical || !normalizedAlternate) {
    return false;
  }

  const current = canonical(normalizedCurrent);
  const canonicalIndex = current.indexOf(canonical(normalizedCanonical));
  const alternateIndex = current.indexOf(canonical(normalizedAlternate));

  return alternateIndex !== -1 && canonicalIndex !== -1 && alternateIndex < canonicalIndex;
}

function pickLeadingModifier(coreTerms: string[]): string | undefined {
  return coreTerms.find((term) => /^[A-Z0-9]{2,6}$/.test(term));
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

export function generateCandidates(input: TitleInput, options: GenerateCandidatesOptions = {}): string[] {
  const { origin, primaryIdentity, secondaryIdentity, core, differentiators, contextTerms, representativeSpec } =
    pickTerms(input);
  const includeCurrentTitle = options.includeCurrentTitle === true;

  const coreVariants = createCoreVariants(core);
  const coreText = coreVariants[0] ?? "";
  const alternateCoreText = coreVariants[1];
  const leadingModifier = pickLeadingModifier(core);
  const leadingModifierVariant = leadingModifier
    ? compact([leadingModifier, ...core.filter((term) => term !== leadingModifier)])
    : undefined;
  const diffText = differentiators.join(" ");
  const ctxText = contextTerms.join(" ");
  const currentLikeCandidate =
    prefersAlternateCoreOrder(input.currentTitle, coreText, alternateCoreText) && alternateCoreText
      ? buildCandidate(origin, primaryIdentity, alternateCoreText, diffText || undefined, representativeSpec)
      : undefined;

  const rawCandidates = [
    buildCandidate(origin, primaryIdentity, secondaryIdentity, diffText || undefined, coreText, representativeSpec),
    buildCandidate(origin, primaryIdentity, secondaryIdentity, coreText, diffText || undefined, ctxText || undefined, representativeSpec),
    currentLikeCandidate ?? buildCandidate(origin, primaryIdentity, diffText || undefined, coreText, ctxText || undefined, representativeSpec),
    leadingModifierVariant
      ? buildCandidate(origin, primaryIdentity, leadingModifierVariant, diffText || undefined, ctxText || undefined, representativeSpec)
      : undefined,
    buildCandidate(origin, primaryIdentity, coreText, diffText || undefined, ctxText || undefined, representativeSpec),
    buildCandidate(origin, primaryIdentity, coreText, diffText || undefined, representativeSpec),
    buildCandidate(primaryIdentity, diffText || undefined, coreText, representativeSpec),
    buildCandidate(primaryIdentity, coreText, diffText || undefined, representativeSpec),
    buildCandidate(primaryIdentity, coreText, ctxText || undefined, representativeSpec),
    buildCandidate(coreText, diffText || undefined, primaryIdentity, representativeSpec),
    buildCandidate(origin, coreText, diffText || undefined, primaryIdentity, ctxText || undefined, representativeSpec),
    alternateCoreText
      ? buildCandidate(origin, primaryIdentity, secondaryIdentity, alternateCoreText, diffText || undefined, ctxText || undefined, representativeSpec)
      : undefined,
    alternateCoreText
      ? buildCandidate(origin, primaryIdentity, alternateCoreText, diffText || undefined, representativeSpec)
      : undefined,
    alternateCoreText
      ? buildCandidate(primaryIdentity, alternateCoreText, diffText || undefined, representativeSpec)
      : undefined
  ];

  const uniqueCandidates = Array.from(
    new Set(rawCandidates.filter((candidate): candidate is string => Boolean(candidate)))
  );

  const fallback = buildCandidate(origin, primaryIdentity, secondaryIdentity, coreText, diffText || undefined, ctxText || undefined, representativeSpec);
  if (fallback && !uniqueCandidates.includes(fallback)) {
    uniqueCandidates.push(fallback);
  }

  return uniqueCandidates.slice(0, 3);
}
