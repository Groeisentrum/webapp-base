# Build context is apps/nextjs.
# Targets linux/arm64 to match the t4g instances this template deploys to.

FROM node:20-alpine AS deps
WORKDIR /app

# Copy manifests alone first so the install layer is cached until they change.
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# next.config.ts sets output: "standalone", so the server ships with only the
# dependencies it actually uses rather than the full node_modules tree.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))" || exit 1

CMD ["node", "server.js"]
