# 0001. Shared event contracts and platform field placement

## Status

Accepted

## Context

Pulse ingests live content from **Twitch** and **YouTube**, then fans that data across chat,
video, ML, analytics, and recommendation services over Kafka. Producers and consumers are
different packages in a Turborepo — without a single, versionable contract:

- payloads drift between TypeScript types and runtime JSON,
- platform identity gets re-derived incorrectly from IDs or topic names,
- a bad message can crash a consumer loop.

The monorepo already favors Zod elsewhere (`@pulse/config`). Kafka messages should use the
same discipline.

## Decision

1. **Zod schemas in `@pulse/event-schemas` are the source of truth** for Kafka payloads.
   TypeScript types are `z.infer<>` of those schemas.
2. **Core event `type` literals** (non-exhaustive): `ingestion.command`, `chat.message`,
   `video.frame`, `transcript.segment`, `sentiment.result`, `brand.mention`,
   `analytics.rollup`, `recommendation.generated`.
3. **Every stream-sourced event carries `platform: "twitch" | "youtube"`** together with
   `eventId`, `streamId`, and `occurredAt` (see `StreamSourcedBaseSchema`).
4. **`@pulse/kafka-client` validates on the wire**: `publishTyped` throws on invalid
   payloads; `consumeTyped` logs and skips invalid messages so the loop stays alive.

Topic names live in `KafkaTopics` (e.g. `pulse.chat.messages`) — operational topology, not
the data model.

## Consequences

### Why `platform` is on every stream-sourced event

- **No ambiguous inference.** Downstream must not guess platform from stream ID shapes,
  usernames, or topic suffixes.
- **Honest cross-platform analytics.** Rollups and recommendations group/compare Twitch vs
  YouTube with an explicit discriminator.
- **Self-describing replays.** Dead-letter, fixtures, and `make demo-seed` payloads carry origin
  without a side registry.
- **Write once.** Adapters that already know the platform stamp it; every consumer trusts the
  field.

### Trade-offs

- One extra enum field per event.
- Producers must set `platform` correctly (Zod rejects unknowns).
- Derived events (`sentiment.result`, `brand.mention`) still carry `platform` so they remain
  stream-sourced for partitioning and dashboards.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Infer platform from `streamId` prefixes / registry | Couples all consumers to conventions; fails offline replay |
| Encode platform only in the topic name | Hurts multi-platform consumers and DLQ inspection |
| Protobuf / JSON Schema without Zod | Deferred — Zod is the TypeScript-first source of truth today |

## Related

- Adapter normalization: `@pulse/platform-adapters` → `NormalizedChatMessage` → `chat.message`
- Scoring field on sentiment: [ADR 0003](./0003-sponsor-relevance-scoring.md)
- Discovery of brokers/URLs: [ADR 0006](./0006-service-discovery-and-config.md)
