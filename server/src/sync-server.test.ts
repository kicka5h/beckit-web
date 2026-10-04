import { generateAutomergeUrl, Repo } from "@automerge/automerge-repo";
import { WebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import WebSocket from "isomorphic-ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryStore } from "./object-store.ts";
import { createSyncServer, type SyncServer } from "./sync-server.ts";
import type { VerifyToken } from "./writers.ts";

const TOKEN = "valid-token";
const ORIGIN = "https://beckit.web.app";

/** Accepts only `TOKEN`, standing in for Firebase in these tests. */
function verify(token: string): ReturnType<VerifyToken> {
  return Promise.resolve(token === TOKEN ? { uid: "uid-1", email: "ash@example.com" } : undefined);
}

interface Note {
  text: string;
}

describe("createSyncServer", () => {
  let sync: SyncServer;
  let baseUrl: string;
  const clients: Repo[] = [];

  function connect(token: string): Repo {
    const url = `${baseUrl.replace("http", "ws")}/sync?token=${token}`;
    const repo = new Repo({ network: [new WebSocketClientAdapter(url, 50)] });
    clients.push(repo);
    return repo;
  }

  beforeEach(async () => {
    sync = createSyncServer({
      store: createMemoryStore(),
      verify,
      allowedOrigins: new Set([ORIGIN]),
    });
    await new Promise<void>((resolve) => sync.server.listen(0, resolve));
    const address = sync.server.address();
    if (!address || typeof address === "string") throw new Error("Server is not listening");
    const { port } = address;
    baseUrl = `http://localhost:${String(port)}`;
  });

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((repo) => repo.shutdown()));
    await sync.close();
  });

  it("carries a document from one signed-in device to another", async () => {
    const laptop = connect(TOKEN);
    const handle = laptop.create<Note>({ text: "Written on the laptop" });
    const phone = connect(TOKEN);
    await vi.waitFor(async () => {
      const found = await phone.find<Note>(handle.url);
      expect(found.doc().text).toBe("Written on the laptop");
    });
  });

  it("refuses a socket without a valid token", async () => {
    const socket = new WebSocket(`${baseUrl.replace("http", "ws")}/sync?token=forged-token`);
    const status = await new Promise<number>((resolve) => {
      socket.on("unexpected-response", (_request, response) => {
        resolve(response.statusCode ?? 0);
      });
    });
    expect(status).toBe(401);
  });

  it("registers a library and hands it back to the same writer", async () => {
    const headers = { Authorization: `Bearer ${TOKEN}`, Origin: ORIGIN };
    const libraryUrl = generateAutomergeUrl();
    const claimed = await fetch(`${baseUrl}/library`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ libraryUrl }),
    });
    expect(claimed.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    const read = await fetch(`${baseUrl}/library`, { headers });
    expect(await read.json()).toEqual({ libraryUrl });
  });

  it("answers the library API only for signed-in writers and well-formed claims", async () => {
    expect((await fetch(`${baseUrl}/library`)).status).toBe(401);
    const badClaim = await fetch(`${baseUrl}/library`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: "not json",
    });
    expect(badClaim.status).toBe(400);
  });

  it("answers health checks, preflights and unknown paths", async () => {
    expect((await fetch(`${baseUrl}/healthz`)).status).toBe(200);
    const preflight = await fetch(`${baseUrl}/library`, {
      method: "OPTIONS",
      headers: { Origin: ORIGIN },
    });
    expect(preflight.status).toBe(204);
    expect((await fetch(`${baseUrl}/library`, { method: "DELETE" })).status).toBe(405);
    expect((await fetch(`${baseUrl}/elsewhere`)).status).toBe(404);
  });
});
