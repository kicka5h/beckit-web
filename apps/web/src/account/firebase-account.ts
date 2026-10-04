import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";

import { createListeners } from "../events/listeners.ts";
import type { Account, AccountService } from "./account.ts";

/** The Firebase web app config, as `infra/setup.sh` stores it for the deploy. */
export interface FirebaseConfig {
  readonly apiKey: string;
  readonly projectId: string;
  readonly appId: string;
  readonly authDomain?: string;
}

function toAccount(user: User): Account | undefined {
  if (!user.email) return undefined;
  return { email: user.email, getToken: () => user.getIdToken() };
}

/**
 * Creates sign-in through Firebase Auth with Google. Sign-in redirects rather than opening a
 * popup, because a Home Screen app on iOS can't open one. The session is kept on the device, so
 * the app knows who is signed in even offline.
 */
export function createFirebaseAccounts(config: FirebaseConfig): AccountService {
  // Signing in through the app's own domain keeps the sign-in page same-origin, which Safari's
  // storage partitioning requires.
  const app = initializeApp({ ...config, authDomain: window.location.host });
  const auth = getAuth(app);
  const listeners = createListeners();
  let account: Account | undefined;

  onIdTokenChanged(auth, (user) => {
    account = user ? toAccount(user) : undefined;
    listeners.notify();
  });

  return {
    current: () => account,
    subscribe: listeners.subscribe,
    signIn: () => signInWithRedirect(auth, new GoogleAuthProvider()),
    signOut: () => signOut(auth),
  };
}
