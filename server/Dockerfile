# The sync server's image. Built from the repository root, so the workspace lockfile pins every
# dependency: docker build -f server/Dockerfile .
FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server ./server
RUN pnpm --filter @beckit/server deploy --prod --legacy /app

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
USER node
# Node 22 runs the TypeScript sources directly, so the image needs no build step.
CMD ["node", "src/main.ts"]
