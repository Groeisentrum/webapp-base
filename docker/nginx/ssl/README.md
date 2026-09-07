# TLS certificates

Nginx expects `cert.pem` and `key.pem` in this directory. Both are gitignored —
a private key must never be committed, and an image must never be built around one.

## Local development

Generate a self-signed pair. Browsers will warn; that is expected locally.

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=localhost" -keyout docker/nginx/ssl/key.pem -out docker/nginx/ssl/cert.pem
```

## Production

Do not use a self-signed certificate in production. Either:

- terminate TLS at an ALB with an ACM certificate and let nginx serve plain HTTP
  behind it (simplest, and the certificate renews itself); or
- place a real certificate here on the instance — Let's Encrypt via certbot works —
  and mount this directory into the nginx container. Renewal is then your
  responsibility; a lapsed certificate takes the whole site down.
