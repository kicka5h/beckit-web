import type { Repo } from "@automerge/automerge-repo";
import { useEffect, useState } from "react";

import type { ManuscriptDoc } from "@beckit/core";

import { findStored } from "../project/documents.ts";

async function findTitle(repo: Repo, url: string): Promise<[string, string][]> {
  const handle = await findStored<ManuscriptDoc>(repo, url);
  return handle ? [[url, handle.doc().title]] : [];
}

/** The titles of the projects at `urls`, keyed by url, as they load from this device. */
export function useProjectTitles(repo: Repo, urls: readonly string[]): ReadonlyMap<string, string> {
  const [titles, setTitles] = useState<ReadonlyMap<string, string>>(new Map());
  // Urls never contain spaces; joining them gives the effect a dependency that is stable
  // across renders, where the array itself is not.
  const urlList = urls.join(" ");

  useEffect(() => {
    let isCurrent = true;
    const loading = urlList ? urlList.split(" ").map((url) => findTitle(repo, url)) : [];
    void Promise.all(loading).then((found) => {
      if (isCurrent) setTitles(new Map(found.flat()));
    });
    return () => {
      isCurrent = false;
    };
  }, [repo, urlList]);

  return titles;
}
