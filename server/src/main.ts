// The sync server's entry point on Cloud Run. Configuration comes from the environment, set by
// the deploy workflow: the bucket, the emails allowed to sync, and the app's origins.
import { Storage } from "@google-cloud/storage";
import { initializeApp } from "firebase-admin/app";

import { createBucketStore, createMemoryStore } from "./object-store.ts";
import { createSyncServer } from "./sync-server.ts";
import { createFirebaseVerifier, toAllowedEmails } from "./writers.ts";

const DEFAULT_PORT = 8080;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

initializeApp();
const bucket = process.env.BECKIT_BUCKET;
const { server } = createSyncServer({
  // Without a bucket the server keeps documents in memory: for running it locally only.
  store: bucket ? createBucketStore(new Storage().bucket(bucket)) : createMemoryStore(),
  verify: createFirebaseVerifier(toAllowedEmails(requireEnv("ALLOWED_EMAILS"))),
  allowedOrigins: new Set(requireEnv("ALLOWED_ORIGINS").split(",")),
});
const port = Number(process.env.PORT ?? DEFAULT_PORT);
server.listen(port, () => {
  console.log(`Beckit sync listening on ${String(port)}`);
});
