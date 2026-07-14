# 0006. Service discovery and centralized config

## Status

Accepted

## Context

Pulse is a cloud-native Node/Kubernetes stack: many Nest services, Kafka, and an ML sidecar.
Two recurring platform questions show up immediately:

1. **How do services find each other** without embedding IP lists?
2. **How is configuration loaded** so local `.env` and production secrets share one typed API?

A separate service-discovery registry (Consul, Eureka) and ad-hoc `process.env` reads in every
service both add noise and create drift.

> **Numbering note:** An earlier note lived as [`0002-service-discovery.md`](./0002-service-discovery.md).
> This ADR is the canonical decision that also covers `@pulse/config`. Treat **0006** as the
> durable ID; 0002-service-discovery remains a short pointer for old links. ORM choice stays
> [`0002-drizzle-orm.md`](./0002-drizzle-orm.md).

## Decision

### Discovery — platform DNS only

| Environment | Mechanism |
| --- | --- |
| Docker Compose | Built-in DNS: reach peers by **Compose service name** (`http://ml-service:8000`, `kafka:9092`) |
| Kubernetes | Native **Service** DNS (`http://ml-service.pulse.svc.cluster.local:8000`; short name in-namespace) |
| Local host processes | Loopback defaults (`http://127.0.0.1:8000`) |

**Do not run a discovery-registry service.** Orchestrator DNS already is the registry.

### Config — `@pulse/config`

- Every Nest service imports `loadConfig(schema)` with a **Zod** schema.
- Local / CI: values come from environment variables.
- Deployed: values may be `secret:…` / `gsm:…` references resolved via Google Secret Manager
  (optional dependency); missing or malformed required config **fails fast at startup**.
- `DEPLOYMENT_ENV=local|compose|kubernetes` drives `resolveServiceBaseUrl` defaults; explicit
  URL env vars always win.

## Consequences

- Compose service names and Kubernetes Service names are a **stable public contract**.
- No Consul sidecars or client LB libraries for basic RPC.
- Unit tests set `OTEL_SDK_DISABLED` / Kafka flags via env; they never need live Secret Manager.
- Operators debug with DNS/`ECONNREFUSED` and readiness probes — not empty registry catalogs.

## Alternatives considered

- **Consul / Eureka:** Valuable on bare VMs; redundant on Compose + Kubernetes DNS.
- **Per-service raw `process.env`:** Fastest to write, slowest to keep correct; Zod loader
  centralizes parsing, defaults, and secret refs.
- **Spring Cloud Config / dedicated config server:** Extra network hop and failure mode for a
  TypeScript monorepo that already ships env via Compose/K8s.
