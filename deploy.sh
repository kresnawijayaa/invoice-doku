#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
APP_URL="${APP_URL:-https://invoice.kresnawijaya.web.id}"

cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Create it before deploying." >&2
  exit 1
fi

echo "==> Pulling latest code"
git pull --ff-only --autostash

echo "==> Building and restarting Docker stack"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "==> Container status"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "==> Waiting for app readiness"
for attempt in {1..30}; do
  if docker logs --tail 80 invoice-doku-app 2>&1 | grep -q "Ready in"; then
    break
  fi

  if [[ "$attempt" == "30" ]]; then
    echo "App did not report readiness in time. Recent logs:" >&2
    docker logs --tail 120 invoice-doku-app >&2
    exit 1
  fi

  sleep 2
done

echo "==> Verifying public URL"
if command -v curl >/dev/null 2>&1; then
  curl -fsSI --max-time 20 "$APP_URL/" >/dev/null
  echo "OK: $APP_URL is reachable"
else
  echo "curl not found; skipping public URL check"
fi

echo "==> Recent app logs"
docker logs --tail 40 invoice-doku-app

echo "Deploy complete."
