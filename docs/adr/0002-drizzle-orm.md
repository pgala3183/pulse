# 0002. Persist detections and analysis results with Drizzle ORM

## Status

Accepted

## Context

`video-service` and `sentiment-service` need to persist sponsor detections and sentiment
results to Postgres for durable analytics and replay. The monorepo already centers on
TypeScript + Zod contracts; the ORM choice should stay lightweight and SQL-transparent.

## Decision

Use **Drizzle ORM** (`drizzle-orm` + `postgres` / `postgres.js`) for Postgres access in
processing services.

## Consequences

- Schema lives as typed TypeScript beside each service (or a future shared `packages/db`).
- Migrations can be added with `drizzle-kit` when we harden deploys; for now services define
  tables in code and tests use in-memory/mocks.
- Avoids Prisma's heavier generate/client step in the Turborepo graph while keeping type safety.

## Alternatives considered

- **Prisma**: Excellent DX, but requires a generated client and another build stage per
  package. Deferred while the processing layer is still early.
- **Raw `pg` / `postgres.js` only**: Possible, but Drizzle gives migrations and typed queries
  with little overhead.
