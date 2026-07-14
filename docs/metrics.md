# Analytics metrics (dashboard contract)

This document is the consumer-facing contract for `analytics-service` rollups. Normative
decision record: [ADR 0004](./adr/0004-analytics-metrics-and-windowing.md). Sponsor relevance
field semantics: [ADR 0003](./adr/0003-sponsor-relevance-scoring.md).

## Windows

| `windowType` | Length | Bucket start |
| --- | --- | --- |
| `1m` | 1 minute | `floor(occurredAt to UTC minute)` |
| `5m` | 5 minutes | `floor(occurredAt to UTC 5-minute)` |
| `session` | Entire stream session | First event seen for `(platform, streamId)` |

## Fields on each rollup

| Field | Type | Meaning |
| --- | --- | --- |
| `platform` | `twitch` \| `youtube` | Stream platform |
| `streamId` | string | Stream identifier |
| `windowType` | `1m` \| `5m` \| `session` | Rollup grain |
| `windowStart` / `windowEnd` | ISO-8601 | Inclusive start, exclusive end (session end = last event time) |
| `chatVolume` | int | Chat messages in window |
| `paidChatVolume` | int | Super Chat / membership messages |
| `sentimentSampleCount` | int | Sentiment results |
| `averageSentimentScore` | float [-1,1] | Mean sentiment score |
| `positiveCount` | int | `label = positive` |
| `neutralCount` | int | `label = neutral` |
| `negativeCount` | int | `label = negative` |
| `brandMentionCount` | int | Sponsor/brand detections |
| `uniqueBrands` | string[] | Distinct brands |
| `averageSponsorRelevance` | float [0,1] | Mean sponsor-relevance when present |
| `engagementScore` | int | `chatVolume + 2*paidChatVolume + brandMentionCount` |

## Example

Three chats (one Super Chat), two sentiments at `+0.5` and `-0.5`, one `Acme` mention in a
1-minute bucket:

- `chatVolume = 3`, `paidChatVolume = 1`
- `averageSentimentScore = 0`
- `brandMentionCount = 1`, `uniqueBrands = ["Acme"]`
- `engagementScore = 3 + 2*1 + 1 = 6`
