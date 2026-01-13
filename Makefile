SHELL := /bin/bash

# Check for .env.development file
ifneq (,$(wildcard .env.development))
    COMPOSE_FLAGS := --env-file .env.development
endif

.PHONY: install build up up-web down restart logs logs-tail ps clean prune format lint test server-dev client-dev

install:
	@(cd shared && npm install)
	@(cd server && npm install)
	@(cd client && npm install)
	@(cd docs && npm install) || true
	@(cd monitor-agent && npm install) || true

fix:
	@(cd shared && npm audit fix)
	@(cd server && npm audit fix)
	@(cd client && npm audit fix)
	@(cd docs && npm install) || true
	@(cd monitor-agent && npm install) || true

build:
	@(cd shared && npm run build)
	@(cd server && npm run build)
	@(cd client && npm run build)

format:
	@(cd client && npm run format || true)
	@(cd server && npm run format || true)

lint:
	@(cd client && npm run lint || true)

up:
	docker compose $(COMPOSE_FLAGS) up -d --build

up-web:
	COMPOSE_PROFILES=with-webserver docker compose $(COMPOSE_FLAGS) up -d --build

down:
	docker compose $(COMPOSE_FLAGS) down

restart:
	docker compose $(COMPOSE_FLAGS) restart

logs:
	docker compose $(COMPOSE_FLAGS) logs --tail=200

logs-tail:
	docker compose $(COMPOSE_FLAGS) logs -f

ps:
	docker compose $(COMPOSE_FLAGS) ps

clean:
	docker compose $(COMPOSE_FLAGS) down -v

prune:
	docker image prune -f && docker builder prune -f

server-dev:
	@(cd server && npm run dev)

client-dev:
	@(cd client && npm run dev)

test:
	@(cd server && npm run test)

reset:
	docker compose $(COMPOSE_FLAGS) down -v
	docker builder prune -a -f
	rm -rf node_modules
	docker compose $(COMPOSE_FLAGS) up -d --build