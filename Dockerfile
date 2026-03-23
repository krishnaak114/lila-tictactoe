# Stage 1: Build the TypeScript Nakama module
FROM node:20-alpine AS builder
WORKDIR /build
COPY nakama-modules/package.json nakama-modules/package-lock.json ./
RUN npm ci
COPY nakama-modules/ ./
RUN npx tsc

# Stage 2: Nakama runtime with the compiled module baked in
FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0
# Nakama's default module path is /nakama/data/modules — copy there so the
# relative entrypoint "index.js" resolves correctly (Go filepath.Join doesn't
# reset on absolute paths, so using an absolute path causes double-prefix bugs)
RUN mkdir -p /nakama/data/modules
COPY --from=builder /build/build/index.js /nakama/data/modules/index.js

# Write startup script — strips postgres:// prefix and ?sslmode=... suffix
# because Nakama's --database.address expects user:pass@host:port/db format
RUN printf '#!/bin/sh\nset -ex\n# Convert postgres:// URI to Nakama database address format\nDB=$(echo "$DATABASE_URL" | sed "s|postgres://||" | sed "s|?.*||")\n/nakama/nakama migrate up --database.address "$DB"\nexec /nakama/nakama \\\n  --name nakama1 \\\n  --database.address "$DB" \\\n  --logger.level INFO \\\n  --session.token_expiry_sec 7200 \\\n  --runtime.js_entrypoint index.js \\\n  --console.password "${NAKAMA_CONSOLE_PASSWORD:-admin}"\n' > /nakama/start.sh \
  && chmod +x /nakama/start.sh

ENTRYPOINT ["/nakama/start.sh"]
