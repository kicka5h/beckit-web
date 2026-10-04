import type { IncomingMessage, ServerResponse } from "node:http";

/** Largest request body the server accepts; a library claim is well under a kilobyte. */
const MAX_BODY_BYTES = 16 * 1024;

/** Writes a JSON response. */
export function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

/** The bearer token in a request's Authorization header, if it carries one. */
export function bearerTokenOf(request: IncomingMessage): string | undefined {
  const header = request.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
}

/** Reads a request's JSON body; undefined when it is too large or not JSON. */
export async function readJson(request: IncomingMessage): Promise<unknown> {
  const parts: Buffer[] = [];
  let size = 0;
  for await (const part of request) {
    if (!Buffer.isBuffer(part)) return undefined;
    size += part.length;
    if (size > MAX_BODY_BYTES) return undefined;
    parts.push(part);
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(parts).toString("utf8"));
    return body;
  } catch {
    return undefined;
  }
}

/** Adds CORS headers when the request comes from an allowed origin; whether it did. */
export function allowOrigin(
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  const { origin } = request.headers;
  if (!origin || !allowedOrigins.has(origin)) return false;
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  response.setHeader("Vary", "Origin");
  return true;
}
