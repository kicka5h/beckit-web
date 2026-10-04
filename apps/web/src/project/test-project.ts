import { type DocHandle, Repo } from "@automerge/automerge-repo";

import { type BlockSnapshot, type ChapterDoc, writeEdit } from "@beckit/core";

import type { DeviceSettings } from "../device/device-settings.ts";

/** Creates a repository held in memory, for tests. */
export function createTestRepo(): Repo {
  return new Repo();
}

/** Creates a stored chapter holding `blocks`, for tests. */
export function createTestChapter(
  repo: Repo,
  blocks: readonly BlockSnapshot[],
): DocHandle<ChapterDoc> {
  const handle = repo.create<ChapterDoc>({ order: [], blocks: {} });
  handle.change((doc) => {
    writeEdit(doc, { order: blocks.map((block) => block.id), changed: blocks, removed: [] });
  });
  return handle;
}

/** Creates device settings held in memory, for tests. */
export function createMemorySettings(): DeviceSettings {
  const values = new Map<string, string>();
  return {
    read: (key) => values.get(key),
    write: (key, value) => {
      values.set(key, value);
    },
  };
}
