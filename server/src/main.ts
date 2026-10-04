// The sync server's entry point. Everything comes from the environment:
//
//   Storage      BECKIT_DATA_DIR (a directory, for self-hosting), else BECKIT_BUCKET (Cloud
//                Storage), else memory (development only).
//   Sign-in      SYNC_PASSPHRASE (self-hosting), else Firebase with ALLOWED_EMAILS.
//   The app      BECKIT_STATIC_DIR serves the built app from this address (self-hosting).
//   Elsewhere    ALLOWED_ORIGINS lists other origins the app is served from (Firebase Hosting).
import { Storage } from "@google-cloud/storage";
import { initializeApp } from "firebase-admin/app";

import { createDirectoryStore } from "./directory-store.ts";
import { createBucketStore, createMemoryStore, type ObjectStore } from "./object-store.ts";
import { createStaticHandler } from "./static-files.ts";
import { createSyncServer } from "./sync-server.ts";
import {
  createFirebaseVerifier,
  createPassphraseVerifier,
  toAllowedEmails,
  type VerifyToken,
} from "./writers.ts";

const DEFAULT_PORT = 8080;

function createStore(): ObjectStore {
  const { BECKIT_DATA_DIR: directory, BECKIT_BUCKET: bucket } = process.env;
  if (directory) return createDirectoryStore(directory);
  if (bucket) return createBucketStore(new Storage().bucket(bucket));
  console.warn("No BECKIT_DATA_DIR or BECKIT_BUCKET: documents live in memory and vanish on exit.");
  return createMemoryStore();
}

function createVerifier(): VerifyToken {
  const { SYNC_PASSPHRASE: passphrase, ALLOWED_EMAILS: allowedEmails } = process.env;
  if (passphrase) return createPassphraseVerifier(passphrase);
  if (!allowedEmails) {
    throw new Error("Set SYNC_PASSPHRASE, or ALLOWED_EMAILS for Firebase sign-in");
  }
  initializeApp();
  return createFirebaseVerifier(toAllowedEmails(allowedEmails));
}

const staticDirectory = process.env.BECKIT_STATIC_DIR;
const { server } = createSyncServer({
  store: createStore(),
  verify: createVerifier(),
  allowedOrigins: new Set((process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean)),
  ...(staticDirectory ? { serveStatic: createStaticHandler(staticDirectory) } : {}),
});
const port = Number(process.env.PORT ?? DEFAULT_PORT);
server.listen(port, () => {
  console.log(`Beckit sync listening on ${String(port)}`);
});
