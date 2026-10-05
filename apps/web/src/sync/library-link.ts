import { type DocHandle, isValidAutomergeUrl, type Repo } from "@automerge/automerge-repo";

import {
  BLANK_FORMAT,
  type ManuscriptDoc,
  outlineOf,
  PARTS,
  piecesOf,
  UNTITLED,
} from "@beckit/core";

import type { DeviceSettings } from "../device/device-settings.ts";
import { findStored } from "../project/documents.ts";
import { addToLibrary, LIBRARY_KEY, type LibraryDoc } from "../project/library.ts";
import { MANUSCRIPT_KEY, rememberTarget } from "../project/open-project.ts";

/**
 * Registers this device's library with the sync server and returns the writer's library: this
 * one if it is the first device to sync, otherwise the one the first device registered.
 */
export async function claimLibrary(
  serverUrl: string,
  token: string,
  libraryUrl: string,
): Promise<string> {
  const response = await fetch(`${serverUrl}/library`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ libraryUrl }),
  });
  if (!response.ok) {
    throw new Error(`The sync server refused the library (${String(response.status)})`);
  }
  const body: unknown = await response.json();
  const claimed: unknown =
    typeof body === "object" && body !== null ? Reflect.get(body, "libraryUrl") : undefined;
  if (!isValidAutomergeUrl(claimed)) throw new Error("The sync server sent no library");
  return claimed;
}

/**
 * Whether a project is the empty one a first launch makes: untitled, blank and without a word.
 * A new device makes one before it knows the writer, so it is left behind when the writer's own
 * library arrives.
 */
export function isUntouched(manuscript: ManuscriptDoc): boolean {
  const pieces = PARTS.flatMap((part) => piecesOf(manuscript, part));
  return (
    manuscript.title === UNTITLED &&
    manuscript.format === BLANK_FORMAT.id &&
    outlineOf(manuscript).length === pieces.length &&
    pieces.length <= 1 &&
    pieces.every(({ piece }) => piece.words === 0)
  );
}

async function isWorthKeeping(repo: Repo, manuscriptUrl: string): Promise<boolean> {
  const manuscript = await findStored<ManuscriptDoc>(repo, manuscriptUrl);
  return manuscript !== undefined && !isUntouched(manuscript.doc());
}

/**
 * What adopting the writer's library did: nothing (this device already uses it), adopted it, or
 * found it unavailable, which is worth trying again.
 */
export type Adoption = "same" | "adopted" | "unavailable";

/**
 * Makes the writer's library this device's library: every project this device made with real
 * writing in it joins it, and an untouched first-launch project is left behind. When the open
 * project is that untouched one, the writer's first project opens instead. Says whether the
 * device's library changed, so the app can reopen.
 */
export async function adoptLibrary(
  repo: Repo,
  settings: DeviceSettings,
  local: DocHandle<LibraryDoc>,
  writerLibraryUrl: string,
): Promise<Adoption> {
  if (writerLibraryUrl === local.url) return "same";
  const writerLibrary = await findStored<LibraryDoc>(repo, writerLibraryUrl);
  if (!writerLibrary) return "unavailable";
  for (const url of local.doc().projects) {
    if (await isWorthKeeping(repo, url)) addToLibrary(writerLibrary, url);
  }
  settings.write(LIBRARY_KEY, writerLibraryUrl);
  const openUrl = settings.read(MANUSCRIPT_KEY);
  const [first] = writerLibrary.doc().projects;
  if (first && openUrl && !(await isWorthKeeping(repo, openUrl))) {
    rememberTarget(settings, { manuscriptUrl: first });
  }
  return "adopted";
}

/**
 * Loads every project in the library and every piece in them, so that each syncs both ways now
 * and all of it is on this device for the next flight.
 */
export async function loadEverything(repo: Repo, library: DocHandle<LibraryDoc>): Promise<void> {
  await Promise.all(
    library.doc().projects.map(async (url) => {
      const manuscript = await findStored<ManuscriptDoc>(repo, url);
      if (!manuscript) return;
      const pieces = PARTS.flatMap((part) => piecesOf(manuscript.doc(), part));
      await Promise.all(pieces.map(({ piece }) => findStored(repo, piece.chapterUrl)));
    }),
  );
}
