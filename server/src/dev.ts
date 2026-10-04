// Runs the sync server locally: documents in memory, and one fixed token standing in for
// Firebase sign-in. For development and the e2e tests; never deployed.
import { createMemoryStore } from "./object-store.ts";
import { createSyncServer } from "./sync-server.ts";

const DEFAULT_PORT = 8787;
const DEV_EMAIL = "writer@localhost";

const token = process.env.DEV_TOKEN ?? "dev";
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const { server } = createSyncServer({
  store: createMemoryStore(),
  verify: (candidate) =>
    Promise.resolve(candidate === token ? { uid: "dev", email: DEV_EMAIL } : undefined),
  allowedOrigins: new Set((process.env.ALLOWED_ORIGINS ?? "http://localhost:4173").split(",")),
});
server.listen(port, () => {
  console.log(`Beckit sync (development) listening on ${String(port)}`);
});
