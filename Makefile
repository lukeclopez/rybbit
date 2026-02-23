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

dev-db:
	docker compose -f docker-compose.dev.yml up -d

stop-db:
	docker compose -f docker-compose.dev.yml down

# Setup server environment variables for local development
setup-server-env:
	@echo "Setting up server environment..."
	@cp .env.development server/.env
	@# Replace database host/port for local access
	@sed -i '' 's/postgres:5432/localhost:5433/g' server/.env
	@# Add missing variables that are usually injected by docker-compose
	@echo "" >> server/.env
	@echo "POSTGRES_HOST=localhost" >> server/.env
	@echo "POSTGRES_PORT=5433" >> server/.env
	@echo "CLICKHOUSE_HOST=http://localhost:8123" >> server/.env
	@echo "CLICKHOUSE_URL=http://default:frog@localhost:8123" >> server/.env

dev-server: setup-server-env
	@(cd server && npm run dev:watch)

# Setup client environment variables for local development
setup-client-env:
	@echo "Setting up client environment..."
	@cp .env.development client/.env.local
	@# Client needs NEXT_PUBLIC_BACKEND_URL which defaults to BASE_URL in docker-compose
	@echo "" >> client/.env.local
	@echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:3001" >> client/.env.local

dev-client: setup-client-env
	@(cd client && npm run dev)