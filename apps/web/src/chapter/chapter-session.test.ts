import * as A from "@automerge/automerge";
import { createChapter, newBlock, readChapter } from "@beckit/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChapterSession } from "./chapter-session.ts";

describe("ChapterSession", () => {
  const first = newBlock("first");
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reads the editor once per save, not once per keystroke", () => {
    const session = new ChapterSession(createChapter("c", [first]));
    const read = vi.fn(() => [first]);
    for (let i = 0; i < 5; i++) session.update(read);
    vi.runAllTimers();
    expect(read).toHaveBeenCalledOnce();
  });

  it("batches rapid edits into one Automerge change", () => {
    const session = new ChapterSession(createChapter("c", [first]));
    const start = A.getHistory(session.save()).length;
    for (const text of ["f", "fi", "fir", "firs", "first!"])
      session.update(() => [{ ...first, text }]);
    vi.runAllTimers();
    expect(A.getHistory(session.save())).toHaveLength(start + 1);
    expect(readChapter(session.save())[0]?.text).toBe("first!");
  });

  it("saves pending edits on demand and notifies subscribers", () => {
    const listener = vi.fn();
    const session = new ChapterSession(createChapter("c", [first]));
    session.subscribe(listener);
    const edited = [{ ...first, text: "edited" }];
    session.update(() => edited);
    session.save();
    expect(listener).toHaveBeenCalledOnce();
    expect(session.blocks).toBe(edited);
    expect(readChapter(session.save())[0]?.text).toBe("edited");
  });

  it("writes nothing when the editor reports the same blocks", () => {
    const session = new ChapterSession(createChapter("c", [first]));
    const heads = A.getHeads(session.save());
    session.update(() => session.blocks);
    expect(A.getHeads(session.save())).toEqual(heads);
  });
});
