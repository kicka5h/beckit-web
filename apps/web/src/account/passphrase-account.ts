import type { DeviceSettings } from "../device/device-settings.ts";
import { createListeners } from "../events/listeners.ts";
import type { Account, AccountService } from "./account.ts";

const PASSPHRASE_KEY = "passphrase";
/** What the outline shows in place of an email: a self-hosted server has one writer. */
const PASSPHRASE_LABEL = "Signed in with the server's passphrase";

/** Whether the server accepts `passphrase`, asked through an endpoint that needs sign-in. */
async function isAccepted(serverUrl: string, passphrase: string): Promise<boolean> {
  const response = await fetch(`${serverUrl}/library`, {
    headers: { Authorization: `Bearer ${passphrase}` },
  });
  return response.ok;
}

/**
 * Creates sign-in for a self-hosted server: the passphrase it was started with, entered once on
 * each device and kept there. It is checked with the server before it is kept, so a typo shows at
 * once rather than as a sync that never starts.
 */
export function createPassphraseAccounts(
  settings: DeviceSettings,
  serverUrl: string,
): AccountService {
  const listeners = createListeners();
  let account: Account | undefined;

  function load(): void {
    const passphrase = settings.read(PASSPHRASE_KEY);
    account = passphrase
      ? { email: PASSPHRASE_LABEL, getToken: () => Promise.resolve(passphrase) }
      : undefined;
    listeners.notify();
  }
  load();

  return {
    signInMethod: "passphrase",
    current: () => account,
    subscribe: listeners.subscribe,
    signIn: async (passphrase = "") => {
      if (!(await isAccepted(serverUrl, passphrase))) {
        throw new Error("The server didn't accept that passphrase.");
      }
      settings.write(PASSPHRASE_KEY, passphrase);
      load();
    },
    signOut: () => {
      settings.write(PASSPHRASE_KEY, "");
      load();
      return Promise.resolve();
    },
  };
}
