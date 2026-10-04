import type { DeviceSettings } from "../device/device-settings.ts";
import type { AccountService } from "./account.ts";
import { createFirebaseAccounts, type FirebaseConfig } from "./firebase-account.ts";
import { createFixedAccounts } from "./fixed-account.ts";
import { createPassphraseAccounts } from "./passphrase-account.ts";

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
 * Creates the account service this build is set up for: a passphrase for a self-hosted server,
 * Firebase with Google sign-in on Google Cloud, a fixed account against a local development
 * server, or none, which keeps everything on the device.
 */
export function createAccounts(
  env: ImportMetaEnv,
  settings: DeviceSettings,
  serverUrl: string,
): AccountService | undefined {
  if (env.VITE_SYNC_AUTH === "passphrase") return createPassphraseAccounts(settings, serverUrl);
  if (env.VITE_DEV_TOKEN) return createFixedAccounts(DEV_EMAIL, env.VITE_DEV_TOKEN);
  const config = env.VITE_FIREBASE_CONFIG && parseFirebaseConfig(env.VITE_FIREBASE_CONFIG);
  return config ? createFirebaseAccounts(config) : undefined;
}
