#!/bin/sh
set -e

ENV_FILE="${ENV_FILE:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file tidak ditemukan: $ENV_FILE" >&2
  exit 1
fi

APP_URL="$(grep '^NEXT_PUBLIC_APP_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"')"
CRON_SECRET="$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"')"

if [ -z "$APP_URL" ] || [ -z "$CRON_SECRET" ]; then
  echo "NEXT_PUBLIC_APP_URL dan CRON_SECRET wajib ada di $ENV_FILE" >&2
  exit 1
fi

curl -fsS -X POST "$APP_URL/api/internal/cron/generate-recurring-invoices" \
  -H "Authorization: Bearer $CRON_SECRET"
