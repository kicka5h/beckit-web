import type { Repo } from "@automerge/automerge-repo";
import { type ReactElement, startTransition, use, useState } from "react";

import { Workspace } from "./components/Workspace.tsx";
import type { DeviceSettings } from "./device/device-settings.ts";
import {
  type OpenProject,
  openProject,
  type OpenTarget,
  rememberTarget,
} from "./project/open-project.ts";

/** Props for `App`. */
export interface AppProps {
  readonly repo: Repo;
  readonly settings: DeviceSettings;
  /** The project opening from device storage; the app suspends until it is ready. */
  readonly initialProject: Promise<OpenProject>;
}

/**
 * The whole app: the writer's open project. Opening another page or project loads it in a
 * transition, so the current page stays on screen until the next one is ready.
 */
export function App({ repo, settings, initialProject }: AppProps): ReactElement {
  const [loading, setLoading] = useState(initialProject);
  const project = use(loading);

  function open(target: OpenTarget): void {
    rememberTarget(settings, target);
    startTransition(() => {
      setLoading(openProject(repo, settings));
    });
  }

  return <Workspace project={project} settings={settings} onOpen={open} />;
}
