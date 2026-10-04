# Beckit, self-hosted: one image serving the app and syncing it, from one address. Works with
# Docker or Podman. See README.md, "Self-hosting".
#
#   docker build -t beckit .        (or: podman build -t beckit .)
FROM docker.io/library/node:22-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# The app syncs with whatever address serves it ("/"), signing in with the server's passphrase.
RUN VITE_SYNC_URL=/ VITE_SYNC_AUTH=passphrase pnpm --filter @beckit/web exec vite build
RUN pnpm --filter @beckit/server deploy --prod --legacy /app && cp -r apps/web/dist /app/public

FROM docker.io/library/node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    BECKIT_STATIC_DIR=/app/public \
    BECKIT_DATA_DIR=/data
COPY --from=build /app ./
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD ["node", "-e", "fetch('http://localhost:' + process.env.PORT + '/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
# Node 22 runs the server's TypeScript sources directly, so it needs no build step.
CMD ["node", "src/main.ts"]
