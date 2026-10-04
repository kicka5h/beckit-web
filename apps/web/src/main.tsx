import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import { createAccounts } from "./account/create-accounts.ts";
import { App } from "./App.tsx";
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

function startSync(): SyncServices | undefined {
  const accounts = createAccounts(import.meta.env);
  const serverUrl = import.meta.env.VITE_SYNC_URL;
  if (!accounts || !serverUrl) return undefined;
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
      />
    </Suspense>
  </StrictMode>,
);
