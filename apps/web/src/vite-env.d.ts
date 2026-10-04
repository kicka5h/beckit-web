/// <reference types="vite/client" />

/** Build settings, set by the deploy workflow (or by hand for local development). */
interface ImportMetaEnv {
  /** The Firebase web app config as JSON, from infra/setup.sh. */
  readonly VITE_FIREBASE_CONFIG?: string;
  /** The sync server's https address. Without it the app keeps everything on the device. */
  readonly VITE_SYNC_URL?: string;
  /** A fixed token for a local sync server, for development and e2e tests only. */
  readonly VITE_DEV_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
