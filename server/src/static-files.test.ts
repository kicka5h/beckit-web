import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createStaticHandler } from "./static-files.ts";

describe("createStaticHandler", () => {
  let root: string;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "beckit-static-"));
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), "<title>Beckit</title>");
    await writeFile(join(root, "sw.js"), "self;");
    await writeFile(join(root, "assets", "index-abc.js"), "app;");
    await writeFile(join(root, "..", "secret.txt"), "not yours");
    const handle = createStaticHandler(root);
    server = createServer((request, response) => {
      void handle(request, response).then((isServed) => {
        if (!isServed) response.writeHead(404).end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Server is not listening");
    baseUrl = `http://localhost:${String(address.port)}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
    await rm(join(root, "..", "secret.txt"), { force: true });
  });

  it("serves files with their type, caching hashed assets and never the service worker", async () => {
    const asset = await fetch(`${baseUrl}/assets/index-abc.js`);
    expect(await asset.text()).toBe("app;");
    expect(asset.headers.get("content-type")).toMatch(/^text\/javascript/);
    expect(asset.headers.get("cache-control")).toMatch(/immutable/);
    expect((await fetch(`${baseUrl}/sw.js`)).headers.get("cache-control")).toBe("no-cache");
  });

  it("answers the root and any app address with the app shell", async () => {
    expect(await (await fetch(`${baseUrl}/`)).text()).toBe("<title>Beckit</title>");
    expect(await (await fetch(`${baseUrl}/some/page`)).text()).toBe("<title>Beckit</title>");
  });

  it("leaves missing files, other methods and paths outside the directory unserved", async () => {
    expect((await fetch(`${baseUrl}/assets/missing.js`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/`, { method: "POST" })).status).toBe(404);
    expect((await fetch(`${baseUrl}/..%2Fsecret.txt`)).status).toBe(404);
  });

  it("answers HEAD without a body", async () => {
    const head = await fetch(`${baseUrl}/index.html`, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });
});
