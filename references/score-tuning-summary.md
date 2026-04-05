# Score Tuning Summary

## Goal

Build a category-agnostic product title scoring engine for Smartstore-style commerce titles.

The engine should prefer:

- clear product identification
- meaningful differentiators
- strong brand or model signals when relevant
- one representative size, quantity, or capacity
- natural Korean commerce phrasing

The engine should penalize:

- repeated or overlapping terms
- promotional or marketplace noise
- contradictory target-user wording
- awkward phrasing
- overloaded variant enumeration

## Current Formula

```text
TitleScore = 4C + 3D + 1X + 2B + 1.5Q - 2R - 1.5L - 3P - 4T - 1.5S - 2V
```

## Variable Meanings

- `C`: core relevance
- `D`: differentiator strength
- `X`: context quality
- `B`: brand or model identity signal
- `Q`: representative quantity, size, capacity, or set composition
- `R`: redundancy penalty
- `L`: length penalty
- `P`: policy or promotion penalty
- `T`: target consistency penalty
- `S`: style naturalness penalty
- `V`: variant overload penalty

## Why These Weights

### Strong positive terms

- `C = 4`
  because product identification is the most important baseline
- `D = 3`
  because true product distinctions often drive search and buying intent
- `B = 2`
  because brand, line, or model matters in many categories but should not dominate all categories

### Medium positive terms

- `Q = 1.5`
  because one representative spec is often helpful, but should not overpower the product identity
- `X = 1`
  because context is useful but secondary

### Strong penalties

- `T = 4`
  because contradictory target-user wording is a severe relevance problem
- `P = 3`
  because promo text and marketplace noise reduce title quality significantly

### Moderate penalties

- `R = 2`
  because repeated synonyms and overlapping noun clusters are common marketplace failure modes
- `V = 2`
  because overloaded variants often hurt focus and readability

### Light penalties

- `L = 1.5`
  because titles should stay compact, but normal commerce titles are often slightly long
- `S = 1.5`
  because awkward style matters, but should not overpower product relevance

## Working Interpretation Rules

### Q vs V

Use `Q` for one representative value:

- `Free`
- `3종`
- `600ml`
- `20인치`
- `10켤레`

Use `V` for overloaded enumerations:

- `Free/L/XL`
- `20인치 24인치 28인치`
- `남자 여자 학생`
- `단목 중목 장목`

### B vs C

Use `B` when the brand, line, or model meaningfully improves identification.

Examples:

- `락앤락`
- `뉴발란스`
- `MR530KA`
- `알러메디`

Do not use `B` for weak or decorative naming that adds little identification value.

### D vs X

Use `D` for true differentiators:

- `무압박`
- `미끄럼방지`
- `확장형`
- `도난방지`
- `보온`

Use `X` for context terms:

- `데일리`
- `캐주얼`
- `하객룩`
- `여행용`
- `사무실용`

## What the Current Samples Show

Across the current sample set:

- clean generated titles often beat noisy marketplace titles
- brand-sensitive categories benefit from `B`
- overloaded marketplace titles are better handled after adding `T` and `V`
- simple functional categories often end in near-ties, which is acceptable

After extending the synthetic validation batch to 10 samples:

- no additional coefficient change is clearly justified yet
- `B`, `Q`, `T`, and `V` appear to be carrying meaningful signal
- `S` behaves like a useful tie-breaker rather than a dominant force
- the current formula is stable enough to treat as `v1 frozen` for further evaluation

## What Not to Do Yet

Do not:

- split the formula by category
- add a separate model-code variable beyond `B`
- add a separate marketplace-noise variable beyond `P`
- tune to tiny differences from one or two examples

## Recommended Validation Loop

1. Create a synthetic product input.
2. Generate 3 candidate titles.
3. Collect 2 to 3 real market titles.
4. Score all titles with the formula.
5. Compare:
   - my preferred title
   - formula top score
   - best market title
6. Record only the mismatches that feel genuinely wrong.
7. Tune weights only after repeated mismatch patterns appear.

## Next Likely Tuning Targets

If the formula starts failing repeatedly, inspect these in order:

1. `B`
2. `Q`
3. `S`
4. `V`

Avoid changing `C`, `D`, `P`, or `T` early unless there is strong repeated evidence.

## Current Decision

Freeze the current formula for the next evaluation round and collect more mismatch cases before changing coefficients again.
