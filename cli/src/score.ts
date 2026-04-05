import type { TitleInput, TitleScoreBreakdown } from "./types.js";

type TargetGroup = "male" | "female" | "child" | "unisex" | "unknown";

const MALE_TERMS = ["남성", "남자", "남성용", "남자용", "men", "mens"];
const FEMALE_TERMS = ["여성", "여자", "여성용", "여자용", "women", "womens"];
const CHILD_TERMS = ["아동", "키즈", "주니어", "어린이", "학생", "kids", "kid", "junior"];
const UNISEX_TERMS = ["남녀공용", "공용", "유니섹스", "unisex"];

const PROMO_PATTERNS = [
  "무료배송",
  "무료 배송",
  "특가",
  "최저가",
  "인기",
  "강추",
  "핫딜",
  "사은품",
  "쿠폰",
  "행사",
  "이벤트",
  "1+1",
  "1 + 1"
];

const NOISY_SYMBOLS = /[★☆♥♡※!@#$%^&*]/;
const REDUNDANT_FAMILIES: string[][] = [MALE_TERMS, FEMALE_TERMS, CHILD_TERMS, ["단목", "중목", "장목"]];

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[\s,./|()[\]{}<>:+\-]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function containsAnyNormalized(title: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const normalizedTitle = normalize(title);
  const matches = new Set(
    terms
      .map((term) => normalize(term))
      .filter((term) => term && normalizedTitle.includes(term))
  ).size;

  if (matches === 0) return 0;
  if (matches >= Math.min(terms.length, 3)) return 1;
  return matches >= 2 ? 0.75 : 0.5;
}

function coverageScore(title: string, terms: string[]): number {
  const uniqueTerms = [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
  if (uniqueTerms.length === 0) return 0;
  const normalizedTitle = normalize(title);
  const matched = uniqueTerms.filter((term) => normalizedTitle.includes(normalize(term))).length;
  if (matched === 0) return 0;

  const ratio = matched / Math.min(uniqueTerms.length, 4);
  if (ratio >= 0.75) return 1;
  if (ratio >= 0.5) return 0.75;
  return 0.4;
}

function scoreCore(title: string, input: TitleInput): number {
  return coverageScore(title, input.coreTerms);
}

function scoreDifferentiator(title: string, input: TitleInput): number {
  return coverageScore(title, input.differentiators);
}

function scoreContext(title: string, input: TitleInput): number {
  return coverageScore(title, input.contextTerms);
}

function scoreBrand(title: string, input: TitleInput): number {
  const normalizedTitle = normalize(title);
  const model = input.modelName?.trim();
  const brand = input.brand?.trim();
  const manufacturer = input.manufacturer?.trim();

  if (model && normalizedTitle.includes(normalize(model))) return 1;
  if (brand && normalizedTitle.includes(normalize(brand))) return 0.85;
  if (manufacturer && normalizedTitle.includes(normalize(manufacturer))) return 0.65;
  return 0;
}

function scoreSpec(title: string, input: TitleInput): number {
  const spec = input.representativeSpec?.trim();
  if (!spec) return 0;

  const normalizedTitle = normalize(title);
  const normalizedSpec = normalize(spec);
  if (!normalizedTitle.includes(normalizedSpec)) return 0;

  const trimmedTitle = normalizedTitle.trim();
  if (trimmedTitle.endsWith(normalizedSpec)) return 1;

  const specAtEndWithSpace = trimmedTitle.endsWith(` ${normalizedSpec}`);
  if (specAtEndWithSpace) return 0.85;

  return 0.5;
}

function scoreRedundancy(title: string): number {
  const tokens = tokenize(title);
  const duplicateTokens = tokens.length - new Set(tokens).size;

  let familyOverlap = 0;
  for (const family of REDUNDANT_FAMILIES) {
    const familyMatches = family.filter((term) => normalize(title).includes(normalize(term))).length;
    if (familyMatches > 1) {
      familyOverlap += familyMatches - 1;
    }
  }

  const total = duplicateTokens + familyOverlap;
  if (total === 0) return 0;
  if (total === 1) return 0.5;
  return 1;
}

function scoreLength(title: string): number {
  const length = title.length;
  if (length <= 24) return 0;
  if (length <= 34) return 0.5;
  return 1;
}

function scorePolicy(title: string, input: TitleInput): number {
  const normalizedTitle = normalize(title);
  const forbidden = input.forbiddenPhrases ?? [];
  const hits = new Set(
    [...forbidden, ...PROMO_PATTERNS].filter((phrase) => normalize(phrase) && normalizedTitle.includes(normalize(phrase)))
  ).size;

  const noisyPromo = NOISY_SYMBOLS.test(title) || /\b(?:무료배송|특가|최저가|인기|강추|핫딜)\b/i.test(title);
  const total = hits + (noisyPromo ? 1 : 0);

  if (total === 0) return 0;
  if (total === 1) return 0.5;
  return 1;
}

function inferTargetGroup(value?: string): TargetGroup {
  const normalized = normalize(value ?? "");
  if (!normalized) return "unknown";
  if (UNISEX_TERMS.some((term) => normalized.includes(normalize(term)))) return "unisex";
  if (MALE_TERMS.some((term) => normalized.includes(normalize(term)))) return "male";
  if (FEMALE_TERMS.some((term) => normalized.includes(normalize(term)))) return "female";
  if (CHILD_TERMS.some((term) => normalized.includes(normalize(term)))) return "child";
  return "unknown";
}

function titleGroups(title: string): Set<TargetGroup> {
  const normalized = normalize(title);
  const groups = new Set<TargetGroup>();

  if (MALE_TERMS.some((term) => normalized.includes(normalize(term)))) groups.add("male");
  if (FEMALE_TERMS.some((term) => normalized.includes(normalize(term)))) groups.add("female");
  if (CHILD_TERMS.some((term) => normalized.includes(normalize(term)))) groups.add("child");
  if (UNISEX_TERMS.some((term) => normalized.includes(normalize(term)))) groups.add("unisex");

  return groups;
}

function scoreTarget(title: string, input: TitleInput): number {
  const expected = inferTargetGroup(input.targetCustomer);
  if (expected === "unknown") return 0;

  const groups = titleGroups(title);

  switch (expected) {
    case "male":
      if (groups.has("female")) return 1;
      if (groups.has("child")) return 0.5;
      return 0;
    case "female":
      if (groups.has("male")) return 1;
      if (groups.has("child")) return 0.5;
      return 0;
    case "child":
      if (groups.has("male") || groups.has("female")) return 1;
      if (groups.has("unisex")) return 0.5;
      return 0;
    case "unisex":
      if (groups.has("male") && groups.has("female")) return 0.5;
      return 0;
    default:
      return 0;
  }
}

function scoreStyle(title: string): number {
  const issues = [
    /\s{2,}/.test(title),
    /[\/|]{2,}/.test(title),
    /[-_]{2,}/.test(title),
    /[()[\]{}]/.test(title),
    /\s[!?.]+$/.test(title),
    /[★☆♥♡※]/.test(title)
  ].filter(Boolean).length;

  if (issues === 0) return 0;
  if (issues === 1) return 0.5;
  return 1;
}

function scoreVariantOverload(title: string, input: TitleInput): number {
  const normalizedTitle = normalize(title);
  const variants = [...new Set((input.variantValues ?? []).map((variant) => variant.trim()).filter(Boolean))];
  const hits = variants.filter((variant) => normalizedTitle.includes(normalize(variant))).length;

  const numericVariantCount = (normalizedTitle.match(/\b\d+\s?(?:cm|mm|ml|l|kg|g|호|인치|켤레|개|장|팩|종)\b/gi) ?? []).length;
  const overload = Math.max(hits, numericVariantCount);

  if (overload <= 1) return 0;
  if (overload === 2) return 0.5;
  return 1;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
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

  return { C, D, X, B, Q, R, L, P, T, S, V, total: roundScore(total) };
}
