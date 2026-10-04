import { createContext } from "react";

import type { AccountService } from "../account/account.ts";
import type { SyncClient } from "./sync-client.ts";

/** Sign-in and sync for this build, or neither when the build keeps everything on the device. */
export interface SyncServices {
  readonly accounts: AccountService;
  readonly sync: SyncClient;
}

/** The app's sign-in and sync, for any component that shows them. Undefined without sync. */
export const SyncContext = createContext<SyncServices | undefined>(undefined);
