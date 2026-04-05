import type { TitleInput } from "./types.js";

function compact(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export function generateCandidates(input: TitleInput): string[] {
  const core = input.coreTerms.slice(0, 4).join(" ");
  const diff = input.differentiators.slice(0, 2).join(" ");
  const ctx = input.contextTerms.slice(0, 2).join(" ");
  const brandOrManufacturer = input.brand || input.manufacturer;

  const candidate1 = compact([
    input.origin,
    brandOrManufacturer,
    input.modelName || undefined,
    core,
    diff || undefined,
    ctx || undefined,
    input.representativeSpec
  ]);

  const candidate2 = compact([
    input.origin,
    core,
    diff || undefined,
    brandOrManufacturer,
    ctx || undefined,
    input.representativeSpec
  ]);

  const candidate3 = compact([
    core,
    diff || undefined,
    ctx || undefined,
    brandOrManufacturer,
    input.representativeSpec
  ]);

  return [candidate1, candidate2, candidate3];
}
