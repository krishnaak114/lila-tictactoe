# Stage 1: Build the TypeScript Nakama module
FROM node:20-alpine AS builder
WORKDIR /build
COPY nakama-modules/package.json nakama-modules/package-lock.json ./
RUN npm ci
COPY nakama-modules/ ./
RUN npx tsc

# Stage 2: Nakama runtime with the compiled module baked in
FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0
COPY --from=builder /build/build/index.js /nakama/modules/index.js

ENTRYPOINT ["/bin/sh", "-ecx", \
  "/nakama/nakama migrate up --database.address \"${DATABASE_URL}\" && \
  exec /nakama/nakama \
    --name nakama1 \
    --database.address \"${DATABASE_URL}\" \
    --logger.level INFO \
    --session.token_expiry_sec 7200 \
    --runtime.js_entrypoint_filepath /nakama/modules/index.js \
    --console.password \"${NAKAMA_CONSOLE_PASSWORD:-admin}\""]
