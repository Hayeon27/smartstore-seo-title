---
name: smartstore-seo-title
description: Generate Smartstore-compliant product title candidates from product details using relevance-focused SEO rules. Use when Codex needs to create, compare, or refine Naver Smartstore product titles, remove promotional phrasing, avoid repeated synonyms, and explain why a title is suitable for Smartstore search relevance.
---

# Smartstore SEO Title

Generate Korean product titles that prioritize Smartstore search relevance over generic copywriting.
Use a category-agnostic product-title frame rather than category-specific heuristics whenever possible.
Treat this skill as a general product-title scoring and recommendation engine for Smartstore-style commerce titles.

Keep the workflow small:

1. Normalize the input into product facts only.
2. Build 3 title candidates from the highest-signal facts.
3. Remove or warn on rule violations.
4. Score the candidates.
5. Recommend 1 final title with a short reason.

Do not optimize for a single category unless the user explicitly asks for category-specific handling.
Default to reusable, cross-category title logic.

Use these input fields when available:

- `product_type`
- `brand`
- `manufacturer`
- `model_name`
- `core_attributes`
- `spec_or_quantity`
- `target_customer`
- `reference_keywords`
- `forbidden_phrases`

Treat missing fields as optional. Do not invent product facts that were not given.
Return final title candidates in Korean unless the user explicitly requests another language.
Use 3 to 4 core keywords to identify the product clearly.
Allow up to 1 to 2 supporting keywords only when they are directly relevant and non-redundant.
Omit quantity by default unless bundle size, capacity, or count materially affects purchase intent.
Prefer a balanced title over maximum keyword coverage.
If `Korean-made` is true and is a strong buying signal for the category, allow it at the beginning of the title.
Prefer meaningful differentiator keywords such as functional or material distinctions when they help separate the product from common alternatives.
Do not mix contradictory target-user terms unless the input explicitly says the product is unisex.

## Generic Title Frame

Build titles in this order when the information exists:

1. `origin_or_brand`
2. `core_product_terms`
3. `differentiators`
4. `context_terms`
5. `quantity_or_size`

Interpret each part like this:

- `origin_or_brand`: country of origin or brand when it is a strong trust or identification signal
- `core_product_terms`: the minimum terms needed to identify what the product is
- `differentiators`: material, function, structure, or feature that separates it from close alternatives
- `context_terms`: usage context, style, target user, season, or scenario
- `quantity_or_size`: count, capacity, dimensions, or size when materially helpful

## Title Rules

Apply these rules in order:

1. Include only product-relevant facts.
2. Exclude shipping, discount, coupon, event, free-gift, and urgency phrases.
3. Exclude promotional adjectives unless they are factual product attributes.
4. Avoid repeating synonyms or near-duplicate nouns.
5. Avoid unrelated brand names or search-bait keywords.
6. Minimize special characters.
7. Keep the title compact and readable.
8. Prefer the generic title frame: origin or brand, core product terms, differentiators, context terms, then quantity or size.
9. Prefer 3 to 4 core keywords plus at most 1 to 2 supporting keywords.
10. Do not include single-item quantity unless it meaningfully helps identification.
11. Place bundle count or quantity at the end of the title when it is included.
12. Prefer true differentiators such as `무압박`, `미끄럼방지`, `논슬립`, `확장형`, `보온`, or other product-specific distinctions over vague filler keywords.
13. Place context terms such as `데일리`, `캐주얼`, `하객룩`, `여행용`, or `사무실용` after differentiators, not before.
14. Do not add male, female, kids, or other target-user terms that conflict with the explicit input.
15. Treat one representative size, capacity, count, or set composition as valid product identification, but penalize titles that enumerate multiple competing variants in one line.

## Output Format

Return exactly these sections:

- `candidate_1`
- `candidate_2`
- `candidate_3`
- `removed_phrases`
- `risk_notes`
- `recommended_title`
- `reason`

When useful, keep `removed_phrases` and `risk_notes` short single-line lists.
Prefer concise output over long explanations.

## Quality Bar

Prefer titles that:

- read naturally in Korean
- surface the most search-relevant product facts early
- remain usable without extra cleanup by the seller

Reject titles that:

- stuff keywords
- repeat similar words
- include marketing copy
- feel too long or noisy

## Scoring Heuristic

After generating candidates, score each title with this heuristic:

```text
TitleScore = 4C + 3D + 1X + 2B + 1.5Q - 2R - 1.5L - 3P - 4T - 1.5S - 2V
```

Use these variables:

- `C` = core relevance
- `D` = differentiator strength
- `X` = context quality
- `B` = brand or model identity signal
- `Q` = quantity or size placement
- `R` = redundancy penalty
- `L` = length penalty
- `P` = policy or promotion penalty
- `T` = target consistency penalty
- `S` = style naturalness penalty
- `V` = variant overload penalty

Score each variable on a simple `0`, `0.5`, or `1.0` scale when possible.

### Variable Guide

- `C = 1.0`
  if the title clearly identifies the product with 3 to 4 core keywords
- `C = 0.5`
  if some core identifying terms are missing or weak
- `C = 0`
  if the title does not clearly identify the product

- `D = 1.0`
  if true differentiators such as function, material, or structure are meaningfully included
- `D = 0.5`
  if the differentiator is weak or only partially useful
- `D = 0`
  if no real differentiator is present

- `X = 1.0`
  if 1 to 2 relevant context terms are included appropriately
- `X = 0.5`
  if context exists but is weak, vague, or slightly noisy
- `X = 0`
  if context is absent or not useful

- `B = 1.0`
  if a strong brand, model, or product-line signal meaningfully helps identification
- `B = 0.5`
  if brand or model information exists but is weak or only moderately useful
- `B = 0`
  if no meaningful brand or model signal is present

- `Q = 1.0`
  if one representative quantity, size, capacity, or set composition is needed and placed naturally at the end
- `Q = 0.5`
  if it is included but awkwardly placed
- `Q = 0`
  if it is unnecessary or distracts from identification

- `R = 1.0`
  if the title repeats synonyms, near-duplicates, or unnecessary noun clusters
- `R = 0.5`
  if repetition is mild
- `R = 0`
  if repetition is cleanly avoided

- `L = 1.0`
  if the title is clearly too long or noisy
- `L = 0.5`
  if the title is somewhat long
- `L = 0`
  if the title is compact and readable

- `P = 1.0`
  if the title contains promotional phrases, search bait, or excessive special characters
- `P = 0.5`
  if the title has minor policy or style issues
- `P = 0`
  if no policy or promotion issue is present

- `T = 1.0`
  if the title mixes contradictory target-user terms or clearly conflicts with the stated target customer
- `T = 0.5`
  if the target-user wording is weak, ambiguous, or partially inconsistent
- `T = 0`
  if target-user wording is consistent with the input

- `S = 1.0`
  if the word order is awkward or the title does not read like a natural Korean commerce title
- `S = 0.5`
  if the title is understandable but somewhat unnatural
- `S = 0`
  if the title is natural and commercially readable

- `V = 1.0`
  if the title overloads variants such as multiple sizes, multiple target groups, or too many option categories in one line
- `V = 0.5`
  if variant or option expansion is slightly excessive
- `V = 0`
  if the title stays focused on a single clear product representation

Representative values such as `Free`, `3종`, `600ml`, `20인치`, or `10켤레` usually belong to `Q`.
Enumerations such as `Free/L/XL`, `20인치 24인치 28인치`, or `남자 여자 학생` should trigger `V`.

Prefer the highest-scoring candidate, but break ties in favor of:

1. clearer product identification
2. less repetition
3. more natural Korean phrasing

## Example Prompt Shape

Use this structure when gathering input:

```text
product_type: ankle socks
brand: 키키
manufacturer:
model_name:
core_attributes: 남성용, 단목, 무지
spec_or_quantity: 10켤레
target_customer: 남성
reference_keywords: 남성 단목 양말, 데일리 양말
forbidden_phrases: 무료배송, 특가, 인기
```

Then generate 3 compliant titles and recommend the best one.

## Cross-Category Examples

Map product facts into the same frame across categories:

- socks: `국산 남성 단목 무지 무압박 데일리 양말 10켤레`
- luggage: `기내용 여행 캐리어 확장형 하드케이스 20인치`
- dress: `블랙 퍼프 롱원피스 하객룩 데일리`
- tumbler: `스테인리스 텀블러 보온 보냉 사무실용 600ml`

Use these only as frame examples. Do not copy category terms into unrelated products.
