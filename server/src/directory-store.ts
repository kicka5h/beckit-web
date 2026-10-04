import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

import type { ObjectStore } from "./object-store.ts";

/** The error code Node gives for a file or directory that does not exist. */
const MISSING = "ENOENT";
const TEMPORARY_SUFFIX = ".tmp";

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && Reflect.get(error, "code") === MISSING;
}

/** The file for object `name`; refuses a name that would land outside the store's directory. */
function pathOf(root: string, name: string): string {
  const path = resolve(root, name);
  if (!path.startsWith(resolve(root) + sep)) {
    throw new Error(`Object name escapes the store: ${name}`);
  }
  return path;
}

/** Every file under `directory`, as paths relative to `root` with "/" between parts. */
async function filesUnder(root: string, directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return filesUnder(root, path);
      return [relative(root, path).split(sep).join("/")];
    }),
  );
  return nested.flat();
}

/**
 * Creates a store over a directory: each object is a file, "/" in its name a subdirectory. For
 * self-hosting, with the directory on a mounted volume.
 */
export function createDirectoryStore(root: string): ObjectStore {
  return {
    read: async (name) => {
      try {
        return new Uint8Array(await readFile(pathOf(root, name)));
      } catch (error) {
        if (isMissing(error)) return undefined;
        throw error;
      }
    },
    write: async (name, data) => {
      const path = pathOf(root, name);
      await mkdir(dirname(path), { recursive: true });
      // Written whole under a temporary name, then renamed into place: a crash or a full disk
      // never leaves half a document where a whole one was.
      const temporary = `${path}.${String(process.pid)}${TEMPORARY_SUFFIX}`;
      await writeFile(temporary, data);
      await rename(temporary, path);
    },
    remove: async (name) => {
      await rm(pathOf(root, name), { force: true });
    },
    list: async (prefix) => {
      const files = await filesUnder(root, root);
      return files
        .filter((name) => name.startsWith(prefix) && !name.endsWith(TEMPORARY_SUFFIX))
        .toSorted((a, b) => a.localeCompare(b));
    },
  };
}
