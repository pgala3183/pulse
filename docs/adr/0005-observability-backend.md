# 0005. Observability backend (Zipkin + Prometheus)

## Status

Accepted

## Context

Pulse NestJS services need distributed tracing and scrapeable metrics for local demos
and Kubernetes. We want a path that is easy to run in Docker Compose without standing
up a full commercial APM.

## Decision

| Signal | Backend | How |
| --- | --- | --- |
| **Traces** | **Zipkin** | OpenTelemetry Node SDK (`@opentelemetry/sdk-node`) with `@opentelemetry/exporter-zipkin` and auto-instrumentations. Endpoint: `OTEL_EXPORTER_ZIPKIN_ENDPOINT` (default `http://localhost:9411/api/v2/spans`). |
| **Metrics** | **Prometheus** | `@willsoto/nestjs-prometheus` exposes `/metrics` on each Nest service; Prometheus scrapes those endpoints. Grafana dashboards query Prometheus. |

Shared helpers live in `@pulse/observability` (`startTelemetry`, `ObservabilityModule`, `PulseMetrics`).

## Why Zipkin (not Jaeger / OTel Collector only)

- Single container, no collector required for local Compose.
- OTel → Zipkin exporter is first-class and well documented.
- UI is enough for span inspection during demos; production can swap the exporter to an
  OTLP collector without changing application instrumentation code beyond env config.

## Consequences

- Set `OTEL_SDK_DISABLED=true` in unit tests to skip the SDK.
- `/metrics` and `/health` must remain unauthenticated for scrapers (api-gateway's API-key
  guard exempts those paths).
- Grafana dashboards under `infra/observability/grafana/` assume metric names
  `pulse_chat_messages_total`, `pulse_sentiment_results_total`, `pulse_brand_mentions_total`,
  and Prometheus `up` for service health.
