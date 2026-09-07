# Build context is docker/nginx.

FROM nginx:alpine

RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/nginx.conf

# Certificates are mounted at runtime rather than baked in, so an image is never
# built around a private key. See docker/nginx/ssl/README.md.
EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1/nginx-health || exit 1
