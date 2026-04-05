# Title Evaluation Template

Use this template to compare generated titles against real market titles.

## Summary Table

```md
| Product ID | Category | Input Summary | Market Title A | Market Title B | Market Title C | Generated 1 | Generated 2 | Generated 3 | My Pick | Formula Pick | Match? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 001 |  |  |  |  |  |  |  |  |  |  |  |  |
```

## Scoring Table

```md
| Title | C | D | X | B | Q | R | L | P | T | S | V | Score |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Generated 1 |  |  |  |  |  |  |  |  |  |  |  |  |
| Generated 2 |  |  |  |  |  |  |  |  |  |  |  |  |
| Generated 3 |  |  |  |  |  |  |  |  |  |  |  |  |
| Market Title A |  |  |  |  |  |  |  |  |  |  |  |  |
| Market Title B |  |  |  |  |  |  |  |  |  |  |  |  |
| Market Title C |  |  |  |  |  |  |  |  |  |  |  |  |
```

## Formula

```text
TitleScore = 4C + 3D + 1X + 2B + 1.5Q - 2R - 1.5L - 3P - 4T - 1.5S - 2V
```

## Variable Guide

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

## Quick Rules

- Give `Q` credit for one representative value such as `Free`, `3종`, `600ml`, `20인치`, or `10켤레`.
- Use `V` when the title enumerates too many competing values such as `Free/L/XL`, `20인치 24인치 28인치`, or `남자 여자 학생`.
- Use `T` when target terms conflict with the input.
- Use `P` for promo phrases, search bait, or obvious marketplace noise.

## Review Questions

1. Does the formula pick the same title I would choose?
2. If not, which variable failed?
3. Did the title need more credit for brand, differentiator, or representative spec?
4. Did the formula under-penalize repetition, target mismatch, or option overload?
5. Should the next tuning change a coefficient or add a new rule instead?
