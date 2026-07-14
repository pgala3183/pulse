# 0002. Service discovery (Compose DNS + Kubernetes DNS)

## Status

Accepted

## Context

Pulse runs as multiple NestJS / FastAPI services that must reach Kafka, each other (e.g.
`api-gateway` → `ml-service`), and datastores. Teams sometimes introduce a dedicated
service-discovery registry (Consul, Eureka, custom). For a cloud-native Node stack that
already deploys on Docker Compose (local) and Kubernetes (prod), that adds moving parts
without clear benefit.

> Note: This ADR shares the `0002` slot with [0002-drizzle-orm](./0002-drizzle-orm.md)
> from an earlier scaffolding step (ORM choice). Treat filenames as the stable IDs.

## Decision

**Do not run a separate discovery-registry service.**

| Environment | How services find each other |
| --- | --- |
| **Docker Compose (local)** | Compose's embedded DNS: a container reaches another by **Compose service name** (e.g. `http://ml-service:8000`, `kafka:9092`). |
| **Kubernetes** | Native **Service** DNS: `http://<service>.<namespace>.svc.cluster.local:<port>` (short name `<service>` works in the same namespace). |

`@pulse/config` exposes `resolveServiceBaseUrl(serviceName, port, deploymentEnv)` and
`DEPLOYMENT_ENV=local|compose|kubernetes` so URL defaults follow this table. Override any
URL with an explicit env/secret when needed.

## Consequences

- Compose `services:` names and Kubernetes `Service` metadata names **are** the discovery
  contract — keep them stable (`ml-service`, `api-gateway`, `chat-service`, …).
- No registry sidecars, lease renewals, or client-side load-balancer libraries for basic
  RPC between our apps. Platform DNS + kube-proxy / Compose networking handle routing.
- Failures look like DNS/`ECONNREFUSED` rather than "registry empty"; health checks on
  Services remain the right readiness signal.

## Alternatives considered

- **Consul / Eureka / custom registry**: Useful for heterogeneous VMs or multi-DC without
  k8s; redundant when every dependency already has a stable DNS name from the orchestrator.
- **Client-side endpoint lists in config maps only**: Still fine as overrides, but not the
  primary discovery mechanism — DNS stays the default.
