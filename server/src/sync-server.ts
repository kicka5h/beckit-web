import { isValidAutomergeUrl, Repo } from "@automerge/automerge-repo";
import { WebSocketServerAdapter } from "@automerge/automerge-repo-network-websocket";
import WebSocket from "isomorphic-ws";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Duplex } from "node:stream";

import { allowOrigin, bearerTokenOf, readJson, sendJson } from "./http.ts";
import { claimLibraryUrl, readLibraryUrl } from "./library-registry.ts";
import type { ObjectStore } from "./object-store.ts";
import type { StaticHandler } from "./static-files.ts";
import { createObjectStorageAdapter } from "./storage-adapter.ts";
import type { VerifyToken, Writer } from "./writers.ts";

/** What the sync server runs on. */
export interface SyncServerOptions {
  readonly store: ObjectStore;
  readonly verify: VerifyToken;
  /** Origins the app is served from, allowed to call the HTTP API from elsewhere. */
  readonly allowedOrigins: ReadonlySet<string>;
  /** Serves the built app from this same address, when self-hosted. */
  readonly serveStatic?: StaticHandler;
}

/** A running sync server: its HTTP server, and a way to stop it. */
export interface SyncServer {
  readonly server: Server;
  readonly close: () => Promise<void>;
}

const SYNC_PATH = "/sync";
const LIBRARY_PATH = "/library";
const HEALTH_PATH = "/healthz";

function reject(socket: Duplex, status: string): void {
  socket.end(`HTTP/1.1 ${status}\r\n\r\n`);
}

async function writerOf(
  request: IncomingMessage,
  verify: VerifyToken,
): Promise<Writer | undefined> {
  const token = bearerTokenOf(request);
  return token ? verify(token) : undefined;
}

async function handleLibrary(
  request: IncomingMessage,
  response: ServerResponse,
  { store, verify }: SyncServerOptions,
): Promise<void> {
  const writer = await writerOf(request, verify);
  if (!writer) {
    sendJson(response, 401, { error: "Sign in to sync" });
    return;
  }
  if (request.method === "GET") {
    // No library yet comes back as {}: JSON drops an undefined field.
    sendJson(response, 200, { libraryUrl: await readLibraryUrl(store, writer.uid) });
    return;
  }
  const body = await readJson(request);
  const url: unknown =
    typeof body === "object" && body !== null ? Reflect.get(body, "libraryUrl") : undefined;
  if (!isValidAutomergeUrl(url)) {
    sendJson(response, 400, { error: "Expected a libraryUrl" });
    return;
  }
  sendJson(response, 200, { libraryUrl: await claimLibraryUrl(store, writer.uid, url) });
}

/** Serves the app for any other path when self-hosted; otherwise there is nothing there. */
async function serveOther(
  request: IncomingMessage,
  response: ServerResponse,
  serveStatic: StaticHandler | undefined,
): Promise<void> {
  const isServed = serveStatic ? await serveStatic(request, response) : false;
  if (!isServed) sendJson(response, 404, { error: "Not found" });
}

/**
 * Routes plain HTTP requests: a health check, the library registry that lets a new device find
 * the writer's projects, and, when self-hosted, the app itself.
 */
async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: SyncServerOptions,
): Promise<void> {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  const isAllowedOrigin = allowOrigin(request, response, options.allowedOrigins);
  if (path === HEALTH_PATH) {
    sendJson(response, 200, { ok: true });
  } else if (path !== LIBRARY_PATH) {
    await serveOther(request, response, options.serveStatic);
  } else if (request.method === "OPTIONS") {
    response.writeHead(isAllowedOrigin ? 204 : 403).end();
  } else if (request.method === "GET" || request.method === "PUT") {
    await handleLibrary(request, response, options);
  } else {
    sendJson(response, 405, { error: "Method not allowed" });
  }
}

/**
 * Creates the sync server: automerge-repo over WebSockets at /sync, storing every document in
 * object storage. A socket opens only with a valid ID token (`?token=`), checked once on connect;
 * the client reconnects with a fresh token when its token renews. The server never announces
 * documents: it answers for those a device asks about or sends.
 */
export function createSyncServer(options: SyncServerOptions): SyncServer {
  // isomorphic-ws is CommonJS: Node finds its classes only on the default export.
  const sockets = new WebSocket.WebSocketServer({ noServer: true });
  const repo = new Repo({
    network: [new WebSocketServerAdapter(sockets)],
    storage: createObjectStorageAdapter(options.store),
    sharePolicy: () => Promise.resolve(false),
  });
  const server = createServer((request, response) => {
    handleRequest(request, response, options).catch((error: unknown) => {
      console.error("Request failed", error);
      if (!response.headersSent) sendJson(response, 500, { error: "Server error" });
    });
  });

  server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token");
    if (url.pathname !== SYNC_PATH || !token) {
      reject(socket, "404 Not Found");
      return;
    }
    void options.verify(token).then((writer) => {
      if (!writer) {
        reject(socket, "401 Unauthorized");
        return;
      }
      sockets.handleUpgrade(request, socket, head, (webSocket) => {
        sockets.emit("connection", webSocket, request);
      });
    });
  });

  return {
    server,
    close: async () => {
      await repo.shutdown();
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    },
  };
}
