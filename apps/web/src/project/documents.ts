import { type DocHandle, isValidAutomergeUrl, type Repo } from "@automerge/automerge-repo";

import { type BlockSnapshot, type ChapterDoc, writeEdit } from "@beckit/core";

/** Finds a document stored on this device, or undefined if it is not here. */
export async function findStored<Value>(
  repo: Repo,
  url: string | undefined,
): Promise<DocHandle<Value> | undefined> {
  if (!isValidAutomergeUrl(url)) return undefined;
  try {
    return await repo.find<Value>(url);
  } catch {
    // The document was never stored here, or the browser cleared it. Callers start a fresh one.
    return undefined;
  }
}

/** Creates a stored chapter holding `blocks`. */
export function createChapterDoc(
  repo: Repo,
  blocks: readonly BlockSnapshot[] = [],
): DocHandle<ChapterDoc> {
  const handle = repo.create<ChapterDoc>({ order: [], blocks: {} });
  if (blocks.length > 0) {
    handle.change((doc) => {
      writeEdit(doc, { order: blocks.map((block) => block.id), changed: blocks, removed: [] });
    });
  }
  return handle;
}
