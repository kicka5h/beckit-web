import { Repo } from "@automerge/automerge-repo";

import type { DeviceSettings } from "../device/device-settings.ts";

/** Creates a repository held in memory, for tests. */
export function createTestRepo(): Repo {
  return new Repo();
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
