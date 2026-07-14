# 0001. Shared event contracts and platform field placement

## Status

Accepted

## Context

Pulse ingests live content from Twitch and YouTube, then fans that data out across chat,
video, ML, analytics, and recommendation services over Kafka. Every service needs a single,
versionable contract for messages on the bus. Without shared schemas, producers and consumers
drift, platform identity gets re-derived incorrectly, and a bad payload can crash a consumer
loop.

## Decision

1. **Zod schemas in `@pulse/event-schemas` are the source of truth** for Kafka event payloads.
   TypeScript types are inferred from those schemas (`z.infer`), so compile-time and runtime
   shapes stay aligned.
2. **Core events today:** `chat.message`, `video.frame`, `transcript.segment`,
   `sentiment.result`, and `brand.mention`.
3. **Every stream-sourced event carries `platform: "twitch" | "youtube"`** (plus shared
   `eventId`, `streamId`, and `occurredAt`) at the producer boundary.
4. **`@pulse/kafka-client` validates with the Zod schema** on publish (`publishTyped`) and
   consume (`consumeTyped`). Invalid publish attempts throw; invalid consumed messages are
   logged and skipped so the consumer keeps running.

## Consequences

### Why `platform` lives on every stream-sourced event

- **No ambiguous inference.** Downstream services must not guess platform from opaque stream
  IDs, username formats, or topic naming. Those heuristics break as soon as ID formats change
  or a shared identity layer appears.
- **Cross-platform aggregation stays honest.** Analytics and recommendations need an explicit
  discriminator to group or compare Twitch vs YouTube without joining another store first.
- **Contracts stay self-describing.** An event dropped on a dead-letter topic, a test fixture,
  or a replay tool still carries its origin without external context.
- **Produces once, trusts many.** The ingest services that already know the platform write it
  once; every downstream consumer reads the same field instead of re-implementing lookup logic.

### Trade-offs

- Slightly larger payloads (one enum field per event).
- Producers must set `platform` correctly; validation will reject missing or unknown values.
- Derived events (`sentiment.result`, `brand.mention`) still include `platform` even though
  they are computed — they remain stream-sourced and must preserve the originating platform
  for partitioning and analytics.

## Alternatives considered

- **Infer platform downstream from `streamId` prefixes or a stream registry.** Rejected:
  couples every consumer to ID conventions or an extra lookup, and fails offline/replay.
- **Encode platform only in the Kafka topic name.** Rejected: complicates multi-platform
  consumers, schema registry reuse, and dead-letter inspection; topic topology should stay an
  operational concern, not the data model.
- **JSON Schema / Protobuf without Zod.** Deferred: Zod keeps a single TypeScript-first
  source of truth that both NestJS and shared packages can validate with today.
