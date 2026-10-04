/** The person signed in on this device, and a way to prove it to the sync server. */
export interface Account {
  readonly email: string;
  /** A current ID token, renewed when the old one is near expiry. Needs the network to renew. */
  readonly getToken: () => Promise<string>;
}

/**
 * Who is signed in, and the ways to sign in and out. Writing never waits on it: the app opens and
 * saves with no account at all, and only sync needs one.
 */
export interface AccountService {
  /** How people sign in: with Google, or with a self-hosted server's passphrase. */
  readonly signInMethod: "google" | "passphrase";
  /** The signed-in account, or undefined when nobody is signed in (or not yet known). */
  readonly current: () => Account | undefined;
  /** Registers a listener for sign-in, sign-out and token renewal; returns its remover. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Signs in; a passphrase server needs the passphrase, and rejects a wrong one. */
  readonly signIn: (passphrase?: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
}
