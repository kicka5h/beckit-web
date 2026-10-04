import { createListeners } from "../events/listeners.ts";
import type { Account, AccountService } from "./account.ts";

/**
 * Creates an account service with one account signed in from the start, holding a fixed token.
 * For running the app against a local sync server in development and in the e2e tests; never
 * built into a deploy.
 */
export function createFixedAccounts(email: string, token: string): AccountService {
  const account: Account = { email, getToken: () => Promise.resolve(token) };
  let isSignedIn = true;
  const listeners = createListeners();

  return {
    signInMethod: "passphrase",
    current: () => (isSignedIn ? account : undefined),
    subscribe: listeners.subscribe,
    signIn: () => {
      isSignedIn = true;
      listeners.notify();
      return Promise.resolve();
    },
    signOut: () => {
      isSignedIn = false;
      listeners.notify();
      return Promise.resolve();
    },
  };
}
