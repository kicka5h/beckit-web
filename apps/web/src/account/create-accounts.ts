import type { AccountService } from "./account.ts";
import { createFirebaseAccounts, type FirebaseConfig } from "./firebase-account.ts";
import { createFixedAccounts } from "./fixed-account.ts";

/** The email the development account signs in as. */
const DEV_EMAIL = "writer@localhost";

function isFirebaseConfig(value: unknown): value is FirebaseConfig {
  if (typeof value !== "object" || value === null) return false;
  return ["apiKey", "projectId", "appId"].every(
    (key) => typeof Reflect.get(value, key) === "string",
  );
}

function parseFirebaseConfig(json: string): FirebaseConfig | undefined {
  try {
    const config: unknown = JSON.parse(json);
    return isFirebaseConfig(config) ? config : undefined;
  } catch {
    // A malformed build setting leaves sign-in off, the same as no setting.
    return undefined;
  }
}

/**
 * Creates the account service this build is set up for: Firebase with Google sign-in in a
 * deploy, a fixed account against a local sync server, or none, which keeps everything on the
 * device.
 */
export function createAccounts(env: ImportMetaEnv): AccountService | undefined {
  if (env.VITE_DEV_TOKEN) return createFixedAccounts(DEV_EMAIL, env.VITE_DEV_TOKEN);
  const config = env.VITE_FIREBASE_CONFIG && parseFirebaseConfig(env.VITE_FIREBASE_CONFIG);
  return config ? createFirebaseAccounts(config) : undefined;
}
