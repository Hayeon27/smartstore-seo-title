import type { TitleInput, TitleScoreBreakdown } from "./types.js";

function containsAny(title: string, terms: string[]): number {
  const matches = terms.filter((term) => title.includes(term)).length;
  if (matches === 0) return 0;
  if (matches >= Math.min(terms.length, 3)) return 1;
  return 0.5;
}

function scoreCore(title: string, input: TitleInput): number {
  return containsAny(title, input.coreTerms);
}

function scoreDifferentiator(title: string, input: TitleInput): number {
  return containsAny(title, input.differentiators);
}

function scoreContext(title: string, input: TitleInput): number {
  return containsAny(title, input.contextTerms);
}

function scoreBrand(title: string, input: TitleInput): number {
  const signals = [input.brand, input.manufacturer, input.modelName].filter(Boolean) as string[];
  return containsAny(title, signals);
}

function scoreSpec(title: string, input: TitleInput): number {
  if (!input.representativeSpec) return 0;
  if (!title.includes(input.representativeSpec)) return 0;
  return title.trim().endsWith(input.representativeSpec) ? 1 : 0.5;
}

function scoreRedundancy(title: string): number {
  const words = title.split(/\s+/).filter(Boolean);
  const unique = new Set(words);
  if (words.length === unique.size) return 0;
  if (unique.size <= words.length - 2) return 1;
  return 0.5;
}

function scoreLength(title: string): number {
  const length = title.length;
  if (length <= 24) return 0;
  if (length <= 34) return 0.5;
  return 1;
}

function scorePolicy(title: string, input: TitleInput): number {
  const forbidden = input.forbiddenPhrases ?? [];
  const hits = forbidden.filter((phrase) => title.includes(phrase)).length;
  if (hits === 0) return 0;
  if (hits === 1) return 0.5;
  return 1;
}

function scoreTarget(title: string, input: TitleInput): number {
  if (!input.targetCustomer) return 0;
  if (input.targetCustomer.includes("남") && title.includes("여")) return 1;
  if (input.targetCustomer.includes("여") && title.includes("남")) return 1;
  return 0;
}

function scoreStyle(title: string): number {
  if (title.includes("  ")) return 1;
  if (/[!@#$%^&*]/.test(title)) return 1;
  return 0;
}

function scoreVariantOverload(title: string, input: TitleInput): number {
  const variants = input.variantValues ?? [];
  const hits = variants.filter((variant) => title.includes(variant)).length;
  if (hits <= 1) return 0;
  if (hits === 2) return 0.5;
  return 1;
}

export function scoreTitle(title: string, input: TitleInput): TitleScoreBreakdown {
  const C = scoreCore(title, input);
  const D = scoreDifferentiator(title, input);
  const X = scoreContext(title, input);
  const B = scoreBrand(title, input);
  const Q = scoreSpec(title, input);
  const R = scoreRedundancy(title);
  const L = scoreLength(title);
  const P = scorePolicy(title, input);
  const T = scoreTarget(title, input);
  const S = scoreStyle(title);
  const V = scoreVariantOverload(title, input);

  const total =
    4 * C +
    3 * D +
    1 * X +
    2 * B +
    1.5 * Q -
    2 * R -
    1.5 * L -
    3 * P -
    4 * T -
    1.5 * S -
    2 * V;

  return { C, D, X, B, Q, R, L, P, T, S, V, total };
}
