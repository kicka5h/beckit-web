import type { Repo } from "@automerge/automerge-repo";
import {
  type ReactElement,
  startTransition,
  use,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import { Workspace } from "./components/Workspace.tsx";
import type { DeviceSettings } from "./device/device-settings.ts";
import {
  type OpenProject,
  openProject,
  type OpenTarget,
  rememberTarget,
} from "./project/open-project.ts";
import { SyncContext, type SyncServices } from "./sync/sync-context.ts";

/** Props for `App`. */
export interface AppProps {
  readonly repo: Repo;
  readonly settings: DeviceSettings;
  /** The project opening from device storage; the app suspends until it is ready. */
  readonly initialProject: Promise<OpenProject>;
  /** Sign-in and sync, or undefined in a build that keeps everything on the device. */
  readonly services: SyncServices | undefined;
}

/**
 * The whole app: the writer's open project. Opening another page or project loads it in a
 * transition, so the current page stays on screen until the next one is ready.
 */
export function App({ repo, settings, initialProject, services }: AppProps): ReactElement {
  const [loading, setLoading] = useState(initialProject);
  const project = use(loading);

  function reopen(): void {
    startTransition(() => {
      setLoading(openProject(repo, settings));
    });
  }

  function open(target: OpenTarget): void {
    rememberTarget(settings, target);
    reopen();
  }

  // A new device that signs in takes on the writer's library, and with it their projects.
  const onLibraryChanged = useEffectEvent(reopen);
  useEffect(
    () =>
      services?.sync.onLibraryChanged(() => {
        onLibraryChanged();
      }),
    [services],
  );

  return (
    <SyncContext value={services}>
      <Workspace project={project} settings={settings} onOpen={open} />
    </SyncContext>
  );
}
