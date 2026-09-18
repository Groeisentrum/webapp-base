# Build context is apps/nextjs.
# CD builds this for the target instance's architecture (linux/amd64 for the
# current t3 deployment) on a runner of the same architecture, so no emulation
# is involved. Nothing here is architecture-specific.

FROM node:20-alpine AS deps
WORKDIR /app

# Copy manifests alone first so the install layer is cached until they change.
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ is optional in Next.js and this app ships no static assets yet, but the
# runtime stage copies it unconditionally. Creating it here keeps that COPY valid
# whether or not the directory is present in the repository.
RUN mkdir -p public && npm run build

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
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
