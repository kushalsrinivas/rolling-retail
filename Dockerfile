# Rolling Retail — TanStack Start (Nitro node-server) for Dokploy / any VPS.
#
# Local:   docker compose up --build          (app + postgres, port 3000)
# Dokploy: new app from https://github.com/cleriko/rr-demo, build type
#          Dockerfile, port 3000. Either use the compose file with the db
#          service below, or attach Dokploy's managed Postgres and set
#          DATABASE_URL on the app. Required env is documented in .env.example.

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NITRO_PRESET=node-server

# Dummy URL so `vite build` (which imports src/db.ts) never fails when no DB
# is wired up at build time. The real value comes from runtime env.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rolling_retail
# Public bundle vars are baked in at build time — pass them as build args
# (Dokploy: build args / env at build) to change them; server secrets below
# are runtime-only and set where you run the container.
ARG VITE_WATERMARK_TEXT="Food Truck Factory"
ARG VITE_MAPBOX_TOKEN=""
ARG VITE_POSTHOG_KEY=""
ARG VITE_POSTHOG_HOST=https://us.i.posthog.com
ARG VITE_APP_TITLE=""

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY references ./references
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=30s \
  CMD node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
