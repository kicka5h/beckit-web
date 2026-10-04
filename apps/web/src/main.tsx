import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";
import { createDeviceRepo } from "./device/device-repo.ts";
import { browserSettings } from "./device/device-settings.ts";
import { requestPersistentStorage } from "./device/persist-storage.ts";
import { openProject } from "./project/open-project.ts";

import "./theme/app.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Opened once, outside React, so development's double rendering never creates two projects.
const project = openProject(createDeviceRepo(), browserSettings);
void requestPersistentStorage();

createRoot(root).render(
  <StrictMode>
    <Suspense>
      <App project={project} settings={browserSettings} />
    </Suspense>
  </StrictMode>,
);
