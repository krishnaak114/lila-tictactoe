FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_ vars must be available at build time — Next.js inlines them into
# the client bundle. Pass via --build-arg when building for production.
ARG NEXT_PUBLIC_NAKAMA_HOST=localhost
ARG NEXT_PUBLIC_NAKAMA_PORT=7350
ARG NEXT_PUBLIC_NAKAMA_USE_SSL=false
ARG NEXT_PUBLIC_NAKAMA_KEY=defaultkey
ENV NEXT_PUBLIC_NAKAMA_HOST=$NEXT_PUBLIC_NAKAMA_HOST
ENV NEXT_PUBLIC_NAKAMA_PORT=$NEXT_PUBLIC_NAKAMA_PORT
ENV NEXT_PUBLIC_NAKAMA_USE_SSL=$NEXT_PUBLIC_NAKAMA_USE_SSL
ENV NEXT_PUBLIC_NAKAMA_KEY=$NEXT_PUBLIC_NAKAMA_KEY

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# public dir is optional — only copy if it exists
COPY --from=builder /app/public* ./public/
EXPOSE 3000
CMD ["node", "server.js"]
