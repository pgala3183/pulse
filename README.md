# Pulse

![Status: early development](https://img.shields.io/badge/status-early%20development-yellow)

Pulse is a real-time, multi-platform (Twitch + YouTube) live stream intelligence platform: it ingests chat and video, runs sentiment analysis and sponsor/brand-mention detection, and surfaces live analytics and recommendations through a GraphQL API and a Next.js dashboard.

## Status

Early development — Nest services, GraphQL gateway, Next.js dashboard, observability, and local Compose stack are in place.

## Local stack

```bash
make up          # Kafka, Postgres, Redis, MinIO, Zipkin, Prometheus, Grafana, apps
make demo-seed   # Synthetic live session → Kafka (+ gateway ingestion mutation)
```

- Dashboard: http://localhost:3001  
- Grafana: http://localhost:3008 (`pulse` / `pulse`) — see `infra/observability/grafana/`  
- Zipkin: http://localhost:9411  
- Traces → Zipkin, metrics → Prometheus (`/metrics` on each Nest service) — [ADR 0005](docs/adr/0005-observability-backend.md)
