# 0003. Sponsor-relevance scoring

## Status

Accepted

## Context

Pulse's core value proposition is not raw sentiment alone — it is how strongly a live moment
is relevant to sponsors/brands. Chat Super Chats and memberships (YouTube) are paid attention
signals Twitch chat lacks; keyword/brand matches and sentiment polarity around those matches
complete the picture.

## Decision

Compute a **sponsor-relevance score** \(R \in [0,1]\) for each analyzed chat/transcript event:

\[
R = w_s \cdot S' + w_k \cdot K + w_p \cdot P
\]

Where weights default to \(w_s = 0.35\), \(w_k = 0.40\), \(w_p = 0.25\) (sum to 1):

| Symbol | Meaning | Range |
| --- | --- | --- |
| \(S'\) | Sentiment aligned to brand context: map score \([-1,1]\) to \([0,1]\) via \((score + 1) / 2\), then boost when a brand match exists | \([0,1]\) |
| \(K\) | Keyword / brand-mention strength: max match confidence × relevance from ML (or lexical fallback) | \([0,1]\) |
| \(P\) | Paid signal: `1.0` for Super Chat / membership chat kinds, else `0` | \(\{0,1\}\) |

Published on `sentiment.result` as optional `sponsorRelevance`. Brand detections still publish
as `brand.mention` events for the detection stream.

## Consequences

- Downstream analytics and recommendations can rank moments by sponsor opportunity without
  re-deriving heuristics.
- Lexical fallbacks still produce \(K\) (and thus \(R\)) when ML is down or low-confidence,
  so the pipeline degrades gracefully.
- Weights are constants today; tune via config later without changing the formula shape.

## Alternatives considered

- **Sentiment-only ranking**: Misses paid YouTube signals and explicit brand mentions.
- **Binary sponsor flag**: Too coarse for live dashboards and recommendations.
