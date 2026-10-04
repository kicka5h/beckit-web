import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import { createAccounts } from "./account/create-accounts.ts";
import { App } from "./App.tsx";
import { createAppUpdate, reloadWhenReplaced } from "./device/app-update.ts";
import { createDeviceRepo } from "./device/device-repo.ts";
import { browserSettings } from "./device/device-settings.ts";
import { requestPersistentStorage } from "./device/persist-storage.ts";
import { openProject } from "./project/open-project.ts";
import { SyncClient } from "./sync/sync-client.ts";
import type { SyncServices } from "./sync/sync-context.ts";

import "./theme/app.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Created once, outside React, so development's double rendering never makes two of anything.
const repo = createDeviceRepo();
const initialProject = openProject(repo, browserSettings);
void requestPersistentStorage();
const update = createAppUpdate({
  register: registerSW,
  flush: () => repo.flush(),
  reloadWhenReplaced,
});

/** The sync server's origin: the configured one, or this page's own when it is "/". */
function serverUrlOf(configured: string): string {
  return new URL(configured, window.location.href).origin;
}

function startSync(): SyncServices | undefined {
  const configured = import.meta.env.VITE_SYNC_URL;
  if (!configured) return undefined;
  const serverUrl = serverUrlOf(configured);
  const accounts = createAccounts(import.meta.env, browserSettings, serverUrl);
  if (!accounts) return undefined;
  const sync = new SyncClient({ repo, accounts, settings: browserSettings, serverUrl });
  // Sync starts once the open project is loaded, so its first look at the library finds it.
  void initialProject.then(() => {
    sync.start();
  });
  return { accounts, sync };
}

createRoot(root).render(
  <StrictMode>
    <Suspense>
      <App
        repo={repo}
        settings={browserSettings}
        initialProject={initialProject}
        services={startSync()}
        update={update}
      />
    </Suspense>
  </StrictMode>,
);
