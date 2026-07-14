# Architecture Decision Records

ADRs capture the design choices that shape Pulse. Read them in order for a coherent picture
of the platform; skim the table when you only need one topic.

## Reading order

| Order | ADR | Decision in one line |
| --- | --- | --- |
| 1 | [0001 — Event contracts](./0001-event-contracts.md) | Zod schemas in `@pulse/event-schemas`; every stream event carries `platform` |
| 2 | [0002 — Drizzle ORM](./0002-drizzle-orm.md) | Drizzle for Postgres persistence in processing services |
| 3 | [0003 — Sponsor-relevance scoring](./0003-sponsor-relevance-scoring.md) | \(R = 0.35S' + 0.40K + 0.25P\) ranks sponsor-worthy moments |
| 4 | [0004 — Analytics metrics & windows](./0004-analytics-metrics-and-windowing.md) | Tumbling `1m` / `5m` / `session` rollups as the dashboard contract |
| 5 | [0005 — Observability](./0005-observability-backend.md) | OpenTelemetry → Zipkin; Prometheus `/metrics` + Grafana |
| 6 | [0006 — Discovery & config](./0006-service-discovery-and-config.md) | Compose/K8s DNS only; typed `loadConfig` via `@pulse/config` |

Related docs: [metrics.md](../metrics.md) (rollup field definitions), [demo.md](../demo.md)
(operator walkthrough).

### Historical filenames

- [`0002-service-discovery.md`](./0002-service-discovery.md) — pointer to **0006** (avoids
  colliding with the ORM ADR under the same number).

## Format

Each ADR uses: **Status**, **Context**, **Decision**, **Consequences**, **Alternatives
considered**. Statuses are `Accepted` unless superseded.
