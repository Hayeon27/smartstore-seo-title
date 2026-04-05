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

$$
\Large \mathrm{TitleScore}
= 4C + 3D + 1X + 2B + 1.5Q - 2R - 1.5L - 3P - 4T - 1.5S - 2V
$$

## Variable Meanings

- `C`: core relevance (product identity terms and category-defining terms)
- `D`: differentiator strength (feature, material, structure, or distinguishing product signals)
- `X`: context quality (usage, style, or scenario terms)
- `B`: brand or model identity signal (brand, line, manufacturer, or model-code identifiers)
- `Q`: representative quantity, size, capacity, or set composition (one primary spec or count signal)
- `R`: redundancy penalty (repeated, overlapping, or near-synonymous title terms)
- `L`: length penalty (overly long titles with too many packed attributes)
- `P`: policy or promotion penalty (promotional copy, marketplace noise, or forbidden phrases)
- `T`: target consistency penalty (conflicting audience, gender, age, or user-group signals)
- `S`: style naturalness penalty (awkward phrasing, noisy punctuation, or broken formatting)
- `V`: variant overload penalty (too many option values, sizes, or variant groups in one title)

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
