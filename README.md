# smartstore-seo-title

Smartstore-style product title scoring and recommendation engine.

This repository contains a reusable skill and evaluation docs for generating Korean commerce product titles that prioritize:

- clear product identification
- meaningful differentiators
- brand or model signals when relevant
- one representative size, quantity, or capacity
- natural Korean commerce phrasing

It is designed as a category-agnostic title engine, not a category-specific title generator.

The repository now also includes a minimal TypeScript CLI prototype for local candidate generation and scoring.

## What This Project Does

The engine takes product facts, generates a small set of title candidates, scores them with a shared heuristic, and recommends the best title.

The current design goal is:

1. Keep title generation reusable across categories
2. Prefer relevance over keyword stuffing
3. Penalize noisy marketplace title patterns
4. Make title choice explainable through scoring

## Current Formula

```text
TitleScore = 4C + 3D + 1X + 2B + 1.5Q - 2R - 1.5L - 3P - 4T - 1.5S - 2V
```

Variable meanings:

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

### Variable Examples

- `C` core relevance
  Typical terms: product identity terms such as `양말`, `단목`, `텀블러`, `캐리어`, `롱원피스`, `도마`

- `D` differentiator strength
  Typical terms: true feature or product distinction terms such as `무압박`, `미끄럼방지`, `확장형`, `하드케이스`, `도난방지`, `항균`, `보온`, `보냉`

- `X` context quality
  Typical terms: usage or style context such as `데일리`, `캐주얼`, `하객룩`, `여행용`, `출근룩`

- `B` brand or model identity signal
  Typical terms: `락앤락`, `뉴발란스`, `MR530KA`, line names, model codes, manufacturer names when they act as title-level identifiers

- `Q` representative quantity, size, capacity, or set composition
  Typical terms: `10켤레`, `600ml`, `20인치`, `28cm`, `Free`, `3종`

- `R` redundancy penalty
  Typical patterns: repeated or overlapping title words such as `휴대폰 핸드폰 스마트폰`, `남자 남성`, `단목 중목 장목`

- `L` length penalty
  Typical pattern: titles that become too long because too many attributes, variants, or contexts are packed into one line

- `P` policy or promotion penalty
  Typical terms: `무료배송`, `특가`, `최저가`, `인기`, `강추`, `핫딜`, `사은품`, `쿠폰`, `이벤트`

- `T` target consistency penalty
  Typical conflict patterns: mixing contradictory target groups such as `남성` with `여성`, or adult-targeted and child-targeted terms in one title

- `S` style naturalness penalty
  Typical patterns: awkward marketplace phrasing, excessive symbols, broken spacing, repeated separators, or visually noisy punctuation

- `V` variant overload penalty
  Typical patterns: listing too many options or variant values in one title such as `20인치 24인치 28인치`, `남자 여자 학생`, `Free L XL`

## Core Ideas

The engine should reward:

- titles that clearly identify the product
- titles with true differentiators such as compression-free, anti-slip, expandable, thermal, or anti-theft features
- brand, line, or model signals when they matter
- one representative spec such as `600ml`, `20-inch`, `10-pair`, `Free`, or `3-set`

The engine should penalize:

- repeated or overlapping nouns
- promotional phrases such as free shipping, special deal, bestseller, or event copy
- contradictory target terms such as male and female mixed in one title
- awkward Korean commerce phrasing
- overloaded variants such as `20-inch 24-inch 28-inch` or mixed target groups in one title

## Repository Structure

```text
smartstore-seo-title/
  README.md
  SKILL.md
  agents/
    openai.yaml
  cli/
    package.json
    tsconfig.json
    src/
    samples/
  references/
    score-tuning-summary.md
    title-evaluation-template.md
    title-evaluation-samples.md
```

## Files

- `SKILL.md`
  Main skill definition for title generation, scoring, and recommendation
- `agents/openai.yaml`
  UI-facing metadata for the skill
- `cli/`
  Minimal TypeScript CLI prototype for local generation and scoring
- `references/title-evaluation-template.md`
  Blank evaluation template for comparing generated and market titles
- `references/title-evaluation-samples.md`
  Filled sample comparisons across multiple categories
- `references/score-tuning-summary.md`
  Tuning rationale and current weight decisions

## CLI Prototype

The CLI is intentionally small and currently focuses on:

- reading a normalized title input JSON file
- generating a few candidate titles
- scoring each candidate with the shared formula
- printing the best recommendation

Example:

```bash
cd cli
npm install
npm run dev
```

Current default sample:

- `cli/samples/socks.json`
- `cli/samples/socks-with-current.json`
- `cli/samples/tumbler-with-current.json`
- `cli/samples/luggage-with-current.json`
- `cli/samples/dress-with-current.json`
- `cli/samples/phone-strap-with-current.json`

The long-term plan is to replace manual sample input with normalized data derived from Smartstore channel-product reads.

Example comparison run:

```bash
cd cli
npx tsx src/index.ts run --input ./samples/socks-with-current.json
```

Example JSON run:

```bash
cd cli
npx tsx src/index.ts run --input ./samples/socks-with-current.json --json
```

Batch run across all samples:

```bash
cd cli
npm run batch
```

Batch JSON run:

```bash
cd cli
npx tsx src/index.ts batch --dir ./samples --json
```

## Validation Approach

This project currently uses:

- synthetic product inputs
- real market title patterns gathered from public listings
- side-by-side comparison between generated and market titles
- score-based mismatch review

The current workflow is:

1. Create a product input
2. Generate 3 candidate titles
3. Collect 2 to 3 real market titles
4. Score all titles
5. Compare:
   - human-preferred title
   - formula top score
   - best market title
6. Tune only when mismatch patterns repeat

## Current Status

The scoring engine is at a practical `v1 frozen` stage.

That means:

- the formula is stable enough for broader evaluation
- future tuning should be based on repeated mismatch cases
- category-specific logic is intentionally deferred

## Example Positioning

This is best understood as:

- a general Smartstore-style title scoring engine
- a reusable commerce title recommendation skill
- a base layer that could later power a CLI or app
