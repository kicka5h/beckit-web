import type { DocHandle, Repo } from "@automerge/automerge-repo";

import type { DeviceSettings } from "../device/device-settings.ts";
import { findStored } from "./documents.ts";

/** The writer's projects, as the addresses of their manuscripts, newest last. */
export interface LibraryDoc {
  projects: string[];
}

const LIBRARY_KEY = "library";

/** Opens this device's library of projects, creating it on first launch. */
export async function openLibrary(
  repo: Repo,
  settings: DeviceSettings,
): Promise<DocHandle<LibraryDoc>> {
  const library =
    (await findStored<LibraryDoc>(repo, settings.read(LIBRARY_KEY))) ??
    repo.create<LibraryDoc>({ projects: [] });
  settings.write(LIBRARY_KEY, library.url);
  return library;
}

/** Lists a project in the library, unless it is there already. */
export function addToLibrary(library: DocHandle<LibraryDoc>, manuscriptUrl: string): void {
  if (library.doc().projects.includes(manuscriptUrl)) return;
  library.change((doc) => {
    doc.projects.push(manuscriptUrl);
  });
}
