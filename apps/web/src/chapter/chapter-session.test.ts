import * as Automerge from "@automerge/automerge";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBlock, createChapter, readChapter } from "@beckit/core";

import { ChapterSession } from "./chapter-session.ts";

describe("ChapterSession", () => {
  const first = createBlock("first");

  function createSession(): ChapterSession {
    return new ChapterSession(createChapter("c", [first]));
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    const start = Automerge.getHistory(session.save()).length;
    for (const text of ["f", "fi", "fir", "firs", "first!"]) {
      session.update(() => [{ ...first, text }]);
    }
    vi.runAllTimers();
    expect(Automerge.getHistory(session.save())).toHaveLength(start + 1);
    expect(readChapter(session.save())[0]?.text).toBe("first!");
  });

  it("saves pending edits on demand and notifies subscribers", () => {
    const session = createSession();
    const listener = vi.fn();
    session.subscribe(listener);
    const edited = [{ ...first, text: "edited" }];
    session.update(() => edited);
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
    const heads = Automerge.getHeads(session.save());
    session.update(() => session.blocks);
    expect(Automerge.getHeads(session.save())).toEqual(heads);
  });
});
