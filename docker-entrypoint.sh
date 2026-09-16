#!/bin/sh
# Production entrypoint: push the Prisma schema, then start Nitro.
# No migrations folder exists in this repo, so `prisma db push` (not
# `migrate deploy`) is the supported way to create tables. Everything is
# best-effort: without DATABASE_URL the /chat designer still works, only
# DB-backed pages (/report) need it.
set -e

# prisma.config.ts reads DIRECT_URL; default it when only DATABASE_URL is set.
if [ -z "$DIRECT_URL" ] && [ -n "$DATABASE_URL" ]; then
  export DIRECT_URL="$DATABASE_URL"
fi

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] pushing prisma schema..."
  npx prisma db push || echo "[entrypoint] WARNING: prisma db push failed — DB-backed pages will error until DATABASE_URL is valid."
  if [ "$SEED_DB" = "true" ]; then
    echo "[entrypoint] seeding demo data..."
    npx --yes tsx prisma/seed.ts || echo "[entrypoint] WARNING: seed failed."
  fi
else
  echo "[entrypoint] DATABASE_URL not set — skipping schema push (/chat works, /report needs a DB)."
fi

exec node .output/server/index.mjs
