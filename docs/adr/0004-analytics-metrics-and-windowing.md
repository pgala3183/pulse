# 0004. Analytics metrics definitions and windowing

## Status

Accepted

## Context

The dashboard and recommendation engine must consume **stable aggregates**, not raw Kafka
firehoses. Window choices need to reconcile:

- near-real-time operator UX (what just happened?),
- slightly smoother trends,
- whole-session reporting for postmortem.

## Decision

`analytics-service` maintains three **tumbling** rollup grains per `(platform, streamId)` and
publishes `analytics.rollup` events (dashboard contract also mirrored in
[docs/metrics.md](../metrics.md)):

| Window | Duration | Alignment |
| --- | --- | --- |
| `1m` | 60s | Floor to UTC minute |
| `5m` | 300s | Floor to UTC 5-minute boundary |
| `session` | Stream lifetime | First observed event → stop / TTL |

### Metric definitions

| Metric | Definition |
| --- | --- |
| `chatVolume` | Count of `chat.message` in the window |
| `paidChatVolume` | Chat with `kind` ∈ {`super_chat`, `membership`} |
| `sentimentSampleCount` | Count of `sentiment.result` |
| `averageSentimentScore` | Mean sentiment `score` ∈ [-1, 1]; `0` if empty |
| `positiveCount` / `neutralCount` / `negativeCount` | Counts by `label` |
| `brandMentionCount` | Count of `brand.mention` |
| `uniqueBrands` | Distinct `brand` values |
| `averageSponsorRelevance` | Mean of `sponsorRelevance` when present ([ADR 0003](./0003-sponsor-relevance-scoring.md)); else `0` |
| `engagementScore` | `chatVolume + 2 * paidChatVolume + brandMentionCount` |

Empty windows are not published. Partial windows update as events arrive (emit-on-change).

The GraphQL gateway today also exposes a simplified in-memory `analyticsSummary` for the
dashboard; the Kafka rollup contract above is the long-term source of truth for
recommendation-service and richer UI.

## Consequences

- Clients should prefer rollups over re-aggregating events.
- Recommendation rules (especially 1m deltas near brand mentions) share numbers with Grafana
  and the Next.js panels.
- UTC bucket alignment makes multi-instance aggregation explainable.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Sliding windows only | Harder to label on a dashboard |
| Per-second rollups | Write amplification without proportional UX gain |
| Session-only metrics | Too coarse for live operator cues |
