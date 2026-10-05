import type { SaveStatus } from "../chapter/chapter-session.ts";
import type { SyncState } from "../sync/sync-client.ts";

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

function toWaitingLabel(waiting: number): string {
  if (waiting === 0) return "Offline";
  return `Offline, ${waiting.toLocaleString()} ${waiting === 1 ? "document" : "documents"} to sync`;
}

/**
 * The plain words the header shows for where the latest edit has got: saving first, then sync.
 * With no sync (signed out, or a build without it) a saved edit reads "Saved on this device".
 */
export function statusLabelOf(save: SaveStatus | undefined, sync: SyncState | undefined): string {
  if (save === "saving") return "Saving…";
  if (save === "failed") return "Not saved: this device's storage refused it";
  switch (sync?.kind) {
    case "offline":
      return toWaitingLabel(sync.waiting);
    case "libraryMissing":
      return "Can't reach your projects yet, retrying";
    case "syncing":
      return "Syncing…";
    case "synced":
      return `Synced ${new Date(sync.at).toLocaleTimeString([], TIME_FORMAT)}`;
    default:
      return "Saved on this device";
  }
}

/** Whether the header's status dot shows settled (accent) rather than in progress (warning). */
export function isSettled(save: SaveStatus | undefined, sync: SyncState | undefined): boolean {
  if (save === "saving" || save === "failed") return false;
  return sync?.kind === "synced" || sync?.kind === "signedOut" || sync === undefined;
}
