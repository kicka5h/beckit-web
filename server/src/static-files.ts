import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";

/** Serves a request from a directory; resolves to whether it did. */
export type StaticHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<boolean>;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};

/** Files a device must check on every visit, so a new version reaches it (as firebase.json says). */
const UNCACHED = new Set(["/index.html", "/sw.js", "/manifest.webmanifest", "/registerSW.js"]);
const HASHED_PREFIX = "/assets/";
const INDEX = "/index.html";

function cacheControlOf(path: string): string {
  if (UNCACHED.has(path)) return "no-cache";
  return path.startsWith(HASHED_PREFIX)
    ? "public, max-age=31536000, immutable"
    : "public, max-age=3600";
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    // Missing or unreadable: either way not a file to serve.
    return false;
  }
}

/** The URL path to serve: the file asked for, or the app shell for an address inside the app. */
async function servedPathOf(root: string, requested: string): Promise<string | undefined> {
  const file = resolve(root, `.${requested}`);
  if (file !== root && !file.startsWith(root + sep)) return undefined;
  if (await isFile(file)) return requested;
  return extname(requested) === "" ? INDEX : undefined;
}

/**
 * Creates a handler serving the built app from `directory`, for a self-hosted server that serves
 * the app and sync from one address. Paths without an extension get the app shell, as on
 * Firebase Hosting.
 */
export function createStaticHandler(directory: string): StaticHandler {
  const root = resolve(directory);
  return async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") return false;
    const requested = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const path = await servedPathOf(root, requested === "/" ? INDEX : requested);
    if (!path) return false;
    response.writeHead(200, {
      "Content-Type": CONTENT_TYPES[extname(path)] ?? "application/octet-stream",
      "Cache-Control": cacheControlOf(path),
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(resolve(root, `.${path}`)).pipe(response);
    return true;
  };
}
