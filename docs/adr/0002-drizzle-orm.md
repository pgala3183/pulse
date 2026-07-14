# 0002. Persist detections and analysis results with Drizzle ORM

## Status

Accepted

## Context

`video-service` and `sentiment-service` (and later analytics) need durable storage for
detections and analysis results in **Postgres** — for replay, operator investigation, and
session-scoped queries that should not depend on Kafka retention alone.

The monorepo is TypeScript + Zod first. The ORM should stay:

- SQL-transparent (readable queries, predictable plans),
- light in the Turborepo graph (no heavy codegen gate on every package),
- typed enough that schema drift is caught at compile time.

## Decision

Use **Drizzle ORM** (`drizzle-orm` + `postgres` / `postgres.js`) for Postgres access in
processing services.

Schemas live as TypeScript beside each service today (e.g. `apps/sentiment-service/src/db`).
A future shared `packages/db` is allowed once migration ownership is clear. Runtime paths
still ship **in-memory repositories** for local/demo when `DATABASE_URL` is absent so the
pipeline demos without Postgres tables being applied.

## Consequences

- Migrations via `drizzle-kit` when hardening deploys; early stages define tables in code and
  prove logic with mocks/in-memory stores.
- Avoids Prisma's generate/client step as a mandatory package build edge while the processing
  layer is still evolving.
- ADR **0002** here is **only** the ORM choice. Service discovery + config is
  [ADR 0006](./0006-service-discovery-and-config.md).

## Alternatives considered

| Alternative | Why not (for now) |
| --- | --- |
| **Prisma** | Excellent DX; heavier generate/client coupling in Turborepo |
| **Raw `postgres.js` only** | Viable, but we still want typed tables and a migration story |
| **Mongo / document store** | Analytic join shapes and rollup metrics map more naturally to SQL |
