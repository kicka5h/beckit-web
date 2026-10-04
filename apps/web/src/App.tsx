import { type ReactElement, use } from "react";

import { Workspace } from "./components/Workspace.tsx";
import type { DeviceSettings } from "./device/device-settings.ts";
import type { OpenProject } from "./project/open-project.ts";

/** Props for `App`. */
export interface AppProps {
  /** The project being opened from device storage; the app suspends until it is ready. */
  readonly project: Promise<OpenProject>;
  readonly settings: DeviceSettings;
}

/** The whole app: the writer's open project, once it has loaded from this device. */
export function App({ project, settings }: AppProps): ReactElement {
  return <Workspace project={use(project)} settings={settings} />;
}
