# 0004. Analytics metrics definitions and windowing

## Status

Accepted

## Context

Dashboard and recommendation consumers need stable, documented aggregates — not raw Kafka
events. Window size choices must balance near-real-time UX (1-minute) with smoother trends
(5-minute) and session-level reporting.

## Decision

`analytics-service` maintains three rollup grains per `(platform, streamId)`:

| Window | Duration | Alignment |
| --- | --- | --- |
| `1m` | 60s | Floor to UTC minute |
| `5m` | 300s | Floor to UTC 5-minute boundary |
| `session` | Stream lifetime | From first observed event for the stream until explicit stop / TTL |

### Metric definitions (dashboard contract)

| Metric | Definition |
| --- | --- |
| `chatVolume` | Count of `chat.message` events in the window |
| `paidChatVolume` | Count of chat messages with `kind` ∈ {`super_chat`, `membership`} |
| `sentimentSampleCount` | Count of `sentiment.result` events |
| `averageSentimentScore` | Mean of sentiment `score` ∈ [-1, 1]; `0` if no samples |
| `positiveCount` / `neutralCount` / `negativeCount` | Counts by sentiment `label` |
| `brandMentionCount` | Count of `brand.mention` events |
| `uniqueBrands` | Distinct `brand` values in the window |
| `averageSponsorRelevance` | Mean of `sponsorRelevance` on sentiment events when present; `0` if none |
| `engagementScore` | `chatVolume + 2 * paidChatVolume + brandMentionCount` — lightweight composite for ranking live moments |

Empty windows are not published. Partial windows are updated as events arrive (emit-on-change).

## Consequences

- GraphQL / dashboard layers should query these rollups rather than re-aggregating events.
- Recommendation rules operate on the same numbers (especially 1m deltas around brand mentions).

## Alternatives considered

- **Sliding windows only**: Harder to explain in a dashboard; tumbling UTC buckets are clearer.
- **Per-second rollups**: Higher write amplification than needed for live ops UX.
