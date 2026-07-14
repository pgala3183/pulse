# 0005. Observability backend (Zipkin + Prometheus)

## Status

Accepted

## Context

Every NestJS service participates in Kafka and HTTP paths that span the monorepo. Local
demos and Kubernetes both need:

- **distributed traces** to follow an ingestion → sentiment → gateway subscription hop,
- **scrapeable metrics** for chat throughput, sentiment/brand rates, and process health,

without standing up a commercial APM for the first mile.

## Decision

| Signal | Backend | Mechanism |
| --- | --- | --- |
| **Traces** | **Zipkin** | OpenTelemetry Node SDK + auto-instrumentations; exporter `@opentelemetry/exporter-zipkin`. Endpoint: `OTEL_EXPORTER_ZIPKIN_ENDPOINT` (Compose default `http://zipkin:9411/api/v2/spans`). |
| **Metrics** | **Prometheus** | `@willsoto/nestjs-prometheus` serves `/metrics`; Prometheus scrapes Nest services; Grafana provisions the *Pulse live operations* dashboard. |

Shared bootstrap lives in `@pulse/observability` (`startTelemetry`, `ObservabilityModule`,
`PulseMetrics`). Domain counters (chat / sentiment / brand / recommendations) are incremented
at the api-gateway Kafka bridge so dashboards reflect what operators see live.

### Why Zipkin (vs Jaeger-only or Collector-mandated)

- One container in Compose — no collector required for demos.
- First-class OTel → Zipkin exporter.
- Production can swap to OTLP without rewriting Nest instrumentation.

## Consequences

- Tests set `OTEL_SDK_DISABLED=true`.
- `/metrics` and `/health` stay unauthenticated (api-gateway API-key guard exempts them).
- Grafana JSON under `infra/observability/grafana/` assumes
  `pulse_chat_messages_total`, `pulse_sentiment_results_total`, `pulse_brand_mentions_total`,
  and Prometheus `up`.

## Alternatives considered

| Alternative | Why not (initially) |
| --- | --- |
| Jaeger all-in | Extra pieces vs Zipkin for local UX |
| OTel Collector required in Compose | Better for prod; heavier for first clone |
| SaaS APM only | Couples demos to vendor keys |

## Related

- Compose services in root `docker-compose.yml`
- CI does not require Zipkin; unit tests disable the SDK
