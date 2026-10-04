import { describe, expect, it } from "vitest";

import { isSettled, statusLabelOf } from "./status-label.ts";

describe("statusLabelOf", () => {
  it("puts saving and failed writes first", () => {
    expect(statusLabelOf("saving", { kind: "synced", at: 0 })).toBe("Saving…");
    expect(statusLabelOf("failed", undefined)).toMatch(/^Not saved/);
  });

  it("says where sync stands once the edit is saved", () => {
    expect(statusLabelOf("saved", undefined)).toBe("Saved on this device");
    expect(statusLabelOf("saved", { kind: "signedOut" })).toBe("Saved on this device");
    expect(statusLabelOf("saved", { kind: "syncing", waiting: 2 })).toBe("Syncing…");
    expect(statusLabelOf("saved", { kind: "offline", waiting: 0 })).toBe("Offline");
    expect(statusLabelOf("saved", { kind: "offline", waiting: 1 })).toBe(
      "Offline, 1 document to sync",
    );
    expect(statusLabelOf(undefined, { kind: "offline", waiting: 3 })).toBe(
      "Offline, 3 documents to sync",
    );
    expect(statusLabelOf("saved", { kind: "synced", at: Date.now() })).toMatch(/^Synced \d/);
  });
});

describe("isSettled", () => {
  it("settles only when saved and not waiting on sync", () => {
    expect(isSettled("saved", { kind: "synced", at: 0 })).toBe(true);
    expect(isSettled("saved", undefined)).toBe(true);
    expect(isSettled("saving", undefined)).toBe(false);
    expect(isSettled("saved", { kind: "offline", waiting: 0 })).toBe(false);
  });
});
