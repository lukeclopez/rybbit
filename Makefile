SHELL := /bin/bash

IMAGE_TAG ?= latest
BASE_URL ?= http://backend:3001
HOST_BACKEND_PORT ?= 127.0.0.1:3001:3001
HOST_CLIENT_PORT ?= 127.0.0.1:3002:3002
DISABLE_SIGNUP ?=
DISABLE_TELEMETRY ?=
MAPBOX_TOKEN ?=
BETTER_AUTH_SECRET ?= devsecret

export IMAGE_TAG BASE_URL HOST_BACKEND_PORT HOST_CLIENT_PORT DISABLE_SIGNUP DISABLE_TELEMETRY MAPBOX_TOKEN BETTER_AUTH_SECRET

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
	docker compose up -d --build

up-web:
	COMPOSE_PROFILES=with-webserver docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs --tail=200

logs-tail:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down -v

prune:
	docker image prune -f && docker builder prune -f

server-dev:
	@(cd server && npm run dev)

client-dev:
	@(cd client && npm run dev)

test:
	@(cd server && npm run test)