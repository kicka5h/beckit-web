import type { Repo } from "@automerge/automerge-repo";

import type { ManuscriptDoc } from "@beckit/core";

import { findStored } from "../project/documents.ts";
import { useLoaded } from "./use-loaded.ts";

const NO_TITLES: ReadonlyMap<string, string> = new Map();

async function findTitle(repo: Repo, url: string): Promise<[string, string][]> {
  const handle = await findStored<ManuscriptDoc>(repo, url);
  return handle ? [[url, handle.doc().title]] : [];
}

/** The titles of the projects at `urls`, keyed by url, as they load from this device. */
export function useProjectTitles(repo: Repo, urls: readonly string[]): ReadonlyMap<string, string> {
  return useLoaded(
    urls,
    async (keys) => new Map((await Promise.all(keys.map((url) => findTitle(repo, url)))).flat()),
    NO_TITLES,
  );
}
