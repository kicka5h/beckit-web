import { applyEdit, diffEdit, readChapter, type BlockSnapshot, type Chapter } from "@beckit/core";

type ReadBlocks = () => readonly BlockSnapshot[];

/**
 * Owns one open chapter. The editor reports each change; the session waits for a pause in
 * typing, then reads the blocks once and writes one Automerge change, so history stays compact
 * and keystrokes stay cheap. It is also a React external store (`subscribe` + `blocks`).
 */
export class ChapterSession {
  #doc: Chapter;
  #written: readonly BlockSnapshot[];
  #pending: ReadBlocks | null = null;
  #timer: ReturnType<typeof setTimeout> | undefined;
  readonly #listeners = new Set<() => void>();
  readonly #delayMs: number;

  constructor(doc: Chapter, delayMs = 400) {
    this.#doc = doc;
    this.#written = readChapter(doc);
    this.#delayMs = delayMs;
  }

  /** Blocks as of the last save. Stable between saves, as React stores require. */
  get blocks(): readonly BlockSnapshot[] {
    return this.#written;
  }

  /** The chapter's title. */
  get title(): string {
    return this.#doc.title;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Records that the editor changed; `read` is called once, when the change is saved. */
  update(read: ReadBlocks): void {
    this.#pending = read;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.save();
    }, this.#delayMs);
  }

  /** Writes any pending change now and returns the up-to-date chapter. */
  save(): Chapter {
    clearTimeout(this.#timer);
    const read = this.#pending;
    if (!read) return this.#doc;
    this.#pending = null;

    const blocks = read();
    const edit = diffEdit(this.#written, blocks);
    if (edit) this.#doc = applyEdit(this.#doc, edit);
    this.#written = blocks;
    this.#listeners.forEach((listener) => {
      listener();
    });
    return this.#doc;
  }
}
