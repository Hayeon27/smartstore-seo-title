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
\Large \mathbf{TitleScore}
= 4\mathbf{C} + 3.5\mathbf{D} + 0.5\mathbf{X} + 2\mathbf{B} + 1.5\mathbf{Q} - 2.5\mathbf{R} - 1.5\mathbf{L} - 3\mathbf{P} - 4\mathbf{T} - 1.5\mathbf{S} - 2\mathbf{V}
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
- `D = 3.5`
  because true product distinctions often drive search and buying intent
- `B = 2`
  because brand, line, or model matters in many categories but should not dominate all categories

### Medium positive terms

- `Q = 1.5`
  because one representative spec is often helpful, but should not overpower the product identity
- `X = 0.5`
  because context is useful but should stay secondary to product identity and differentiators

### Strong penalties

- `T = 4`
  because contradictory target-user wording is a severe relevance problem
- `P = 3`
  because promo text and marketplace noise reduce title quality significantly

### Moderate penalties

- `R = 2.5`
  because repeated synonyms and overlapping noun clusters are common marketplace failure modes and should be punished more clearly
- `V = 2`
  because overloaded variants often hurt focus and readability

### Light penalties

- `L = 1.5`
  because titles should stay compact, but normal commerce titles are often slightly long
- `S = 1.5`
  because awkward style matters, but should not overpower product relevance

## Tie-Breaker Policy

When two candidate titles have the same `TitleScore`, the CLI applies a secondary comparator.

For documentation purposes, the secondary comparator can be summarized as:

$$
\Large \mathbf{TieBreakScore}
= 3\mathbf{O} + 2\mathbf{I} + 2\mathbf{K} + 1.5\mathbf{F} + 1\mathbf{Q}
- 1\mathbf{X_e} - 1\mathbf{N} - 1\mathbf{L_t}
$$

This follows a practical tie-aware ranking view:

- do not resolve tied candidates arbitrarily
- prefer candidates with a stronger product-identifying order
- prefer listwise relevance signals over extra context words

The current secondary comparator prefers:

- stronger `origin -> identity -> core -> differentiator -> spec` ordering
- fewer unnecessary context terms
- shorter and cleaner titles
- more stable lexical ordering as a final fallback

Where:

- `O`: preferred overall field ordering quality
- `I`: identity placement quality
- `K`: core-term placement quality
- `F`: differentiator placement quality
- `Q`: spec placement quality
- `X_e`: extra context usage penalty
- `N`: punctuation or noise penalty
- `L_t`: title compactness penalty
