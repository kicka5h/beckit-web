import { type ReactElement, useSyncExternalStore } from "react";

import type { AccountService } from "../account/account.ts";
import type { SyncClient } from "../sync/sync-client.ts";

/** Props for `AccountPanel`. */
export interface AccountPanelProps {
  readonly accounts: AccountService;
  readonly sync: SyncClient;
}

/**
 * Sign-in at the foot of the outline. Writing never needs it: signing in only turns on sync. Sign
 * out waits until every change has reached the server, so none is stranded on this device.
 */
export function AccountPanel({ accounts, sync }: AccountPanelProps): ReactElement {
  const account = useSyncExternalStore(accounts.subscribe, accounts.current);
  const state = useSyncExternalStore(sync.subscribe, () => sync.state);

  if (!account) {
    return (
      <section className="list account">
        <h2 className="list__heading">Sync</h2>
        <div className="list__actions">
          <button
            type="button"
            onClick={() => {
              void accounts.signIn();
            }}
          >
            Sign in with Google to sync
          </button>
        </div>
      </section>
    );
  }
  const canSignOut = state.kind === "synced";
  return (
    <section className="list account">
      <h2 className="list__heading">Sync</h2>
      <p className="account__email">{account.email}</p>
      <div className="list__actions">
        <button
          type="button"
          disabled={!canSignOut}
          title={canSignOut ? undefined : "Waiting for every change to reach the server"}
          onClick={() => {
            void accounts.signOut();
          }}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
