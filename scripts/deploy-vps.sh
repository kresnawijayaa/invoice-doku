#!/bin/sh
set -e

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file tidak ditemukan: $ENV_FILE" >&2
  exit 1
fi

echo "Pulling app image..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull app

echo "Starting containers..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo "Deployment done."
