# Pulse local development helpers
COMPOSE := docker compose

.PHONY: up down logs demo-seed build test lint

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f --tail=200

build:
	pnpm build

test:
	OTEL_SDK_DISABLED=true pnpm test

lint:
	pnpm lint

# Simulates an end-to-end live stream session (Kafka events + gateway mutation).
# Requires Kafka (and preferably api-gateway) from `make up`.
demo-seed:
	pnpm demo-seed
