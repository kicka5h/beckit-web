import * as Automerge from "@automerge/automerge";
import type { DocHandle } from "@automerge/automerge-repo";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ChapterDoc, createBlock, readChapter, writeEdit } from "@beckit/core";

import { storeChapter } from "../project/documents.ts";
import { createTestRepo } from "../project/test-project.ts";
import { ChapterSession, type ChapterSessionOptions } from "./chapter-session.ts";

describe("ChapterSession", () => {
  const first = createBlock("first");
  let handle: DocHandle<ChapterDoc>;

  function createSession(options: ChapterSessionOptions = {}): ChapterSession {
    handle = storeChapter(createTestRepo(), [first]);
    return new ChapterSession(handle, options);
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens on the chapter's stored blocks", () => {
    expect(createSession().blocks).toEqual([first]);
  });

  it("reads the editor once per save, not once per keystroke", () => {
    const session = createSession();
    const read = vi.fn(() => [first]);
    for (let count = 0; count < 5; count++) session.update(read);
    vi.runAllTimers();
    expect(read).toHaveBeenCalledOnce();
  });

  it("batches rapid edits into one Automerge change", () => {
    const session = createSession();
    const start = Automerge.getHistory(handle.doc()).length;
    for (const text of ["f", "fi", "fir", "firs", "first!"]) {
      session.update(() => [{ ...first, text }]);
    }
    vi.runAllTimers();
    expect(Automerge.getHistory(handle.doc())).toHaveLength(start + 1);
    expect(readChapter(handle.doc())[0]?.text).toBe("first!");
  });

  it("saves pending edits on demand and notifies subscribers", () => {
    const session = createSession();
    const listener = vi.fn();
    const edited = [{ ...first, text: "edited" }];
    session.update(() => edited);
    session.subscribe(listener);
    session.save();
    expect(listener).toHaveBeenCalledOnce();
    expect(session.blocks).toBe(edited);
  });

  it("stops notifying a listener once it unsubscribes", () => {
    const session = createSession();
    const listener = vi.fn();
    session.subscribe(listener)();
    session.update(() => [first]);
    session.save();
    expect(listener).not.toHaveBeenCalled();
  });

  it("writes nothing when the editor reports the same blocks", () => {
    const session = createSession();
    const heads = Automerge.getHeads(handle.doc());
    session.update(() => session.blocks);
    session.save();
    expect(Automerge.getHeads(handle.doc())).toEqual(heads);
  });

  it("does nothing when saved with no pending edit", () => {
    const session = createSession();
    const listener = vi.fn();
    session.subscribe(listener);
    session.save();
    expect(listener).not.toHaveBeenCalled();
  });

  describe("when another device changes the chapter", () => {
    const second = createBlock("second");

    function changeElsewhere(): void {
      handle.change((doc) => {
        writeEdit(doc, { order: [first.id, second.id], changed: [second], removed: [] });
      });
    }

    it("hands over the merged blocks and moves its revision", () => {
      const session = createSession();
      const listener = vi.fn();
      session.subscribe(listener);
      changeElsewhere();
      expect(session.revision).toBe(1);
      expect(session.blocks.map(({ text }) => text)).toEqual(["first", "second"]);
      expect(listener).toHaveBeenCalled();
    });

    it("saves what was typed here before merging, so neither side is lost", () => {
      const session = createSession();
      session.update(() => [{ ...first, text: "first, edited here" }]);
      changeElsewhere();
      expect(session.blocks.map(({ text }) => text)).toEqual(["first, edited here", "second"]);
    });

    it("leaves its own writes alone and stops listening once closed", () => {
      const session = createSession();
      session.update(() => [{ ...first, text: "edited" }]);
      session.save();
      expect(session.revision).toBe(0);
      session.close();
      changeElsewhere();
      expect(session.revision).toBe(0);
    });
  });

  describe("when reporting whether the chapter is stored", () => {
    it("is saving from the first keystroke until storage confirms the write", async () => {
      let confirm: (() => void) | undefined;
      const session = createSession({
        flush: () =>
          new Promise((resolve) => {
            confirm = resolve;
          }),
      });
      expect(session.status).toBe("saved");
      session.update(() => [{ ...first, text: "edited" }]);
      expect(session.status).toBe("saving");
      session.save();
      expect(session.status).toBe("saving");
      confirm?.();
      await vi.waitFor(() => {
        expect(session.status).toBe("saved");
      });
    });

    it("stays saving when a newer edit arrives before storage confirms", async () => {
      const session = createSession();
      session.update(() => [{ ...first, text: "one" }]);
      session.save();
      session.update(() => [{ ...first, text: "two" }]);
      await Promise.resolve();
      expect(session.status).toBe("saving");
    });

    it("reports a failed write", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const session = createSession({ flush: () => Promise.reject(new Error("quota exceeded")) });
      session.update(() => [{ ...first, text: "edited" }]);
      session.save();
      await vi.waitFor(() => {
        expect(session.status).toBe("failed");
      });
      expect(console.error).toHaveBeenCalledOnce();
    });
  });
});
