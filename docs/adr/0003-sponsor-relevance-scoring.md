# 0003. Sponsor-relevance scoring

## Status

Accepted

## Context

Pulse’s product claim is **sponsor intelligence**, not a generic sentiment chart. A moment is
valuable when brand context, audience mood, and (on YouTube) **paid attention** align.
Twitch and YouTube do not expose the same paid chat primitives — the score must remain
comparable while still using Super Chat / membership when present.

## Decision

Compute a **sponsor-relevance score** \(R \in [0,1]\) for each analyzed chat or transcript
event (implemented in `apps/sentiment-service/src/scoring/sponsor-relevance.ts`):

\[
R = w_s \cdot S' + w_k \cdot K + w_p \cdot P
\]

Default weights (\(w_s + w_k + w_p = 1\)):

| Weight | Default | Rationale |
| --- | --- | --- |
| \(w_s\) | 0.35 | Mood matters, but not without brand context |
| \(w_k\) | 0.40 | Explicit brand evidence dominates |
| \(w_p\) | 0.25 | Paid YouTube signals are strong but sparse |

| Symbol | Definition | Range |
| --- | --- | --- |
| \(S'\) | Map sentiment `score` \([-1,1]\) → \([0,1]\) via \((score+1)/2\); multiply by **0.65** when there is **no** brand match so pure vibes-chat does not look like a sponsorship beat | \([0,1]\) |
| \(K\) | \(\max_i(\mathrm{confidence}_i \times \mathrm{relevance}_i)\) over brand matches from ML or lexical fallback; `0` if none | \([0,1]\) |
| \(P\) | `1` if chat `kind` ∈ {`super_chat`, `membership`}, else `0` | \(\{0,1\}\) |

Publish \(R\) on `sentiment.result` as optional `sponsorRelevance`. Distinct brand hits still
emit `brand.mention` for the detection timeline.

Analytics averages `sponsorRelevance` into `averageSponsorRelevance` on rollups
([ADR 0004](./0004-analytics-metrics-and-windowing.md)); recommendations key off high
engagement + relevance.

## Consequences

- Operators can sort live moments by sponsor opportunity without re-deriving heuristics.
- Lexical fallbacks still produce \(K\) (and thus \(R\)) when ML is down — graceful degradation.
- Weights are constants today; changing them does not require a formula redesign.
- Twitch moments rely on \(S'\) and \(K\); YouTube can additionally light up \(P\).

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Sentiment-only ranking | Ignores brands and Super Chats |
| Binary “sponsor flag” | Too coarse for dashboards and recommendation severity |
| Platform-specific scoring models | Harder to compare Twitch vs YouTube on one panel |

## Related

- Product summary in the [README](../../README.md#sponsor-relevance-scoring)
- Event field: `@pulse/event-schemas` → `SentimentResultEvent.sponsorRelevance`
