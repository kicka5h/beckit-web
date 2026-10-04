import { applyEdit, type BlockSnapshot, type Chapter, diffEdit, readChapter } from "@beckit/core";

/** A function that reads the editor's current blocks, called once per save rather than per keystroke. */
type ReadBlocks = () => readonly BlockSnapshot[];

/**
 * The owner of one open chapter. The editor reports each change; the session waits for a pause in
 * typing, then reads the blocks once and writes one Automerge change, so history stays compact
 * and keystrokes stay cheap. It is also a React external store (`subscribe` + `blocks`).
 */
export class ChapterSession {
  #chapter: Chapter;
  #written: readonly BlockSnapshot[];
  #pending: ReadBlocks | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  readonly #listeners = new Set<() => void>();
  readonly #delayMilliseconds: number;

  constructor(chapter: Chapter, delayMilliseconds = 400) {
    this.#chapter = chapter;
    this.#written = readChapter(chapter);
    this.#delayMilliseconds = delayMilliseconds;
  }

  /** Blocks as of the last save. Stable between saves, as React stores require. */
  get blocks(): readonly BlockSnapshot[] {
    return this.#written;
  }

  /** The chapter's title. */
  get title(): string {
    return this.#chapter.title;
  }

  /** Registers a listener called after each save; returns the function that removes it. */
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
    }, this.#delayMilliseconds);
  }

  /** Writes any pending change now and returns the up-to-date chapter. */
  save(): Chapter {
    clearTimeout(this.#timer);
    const read = this.#pending;
    if (!read) return this.#chapter;
    this.#pending = undefined;

    const blocks = read();
    const edit = diffEdit(this.#written, blocks);
    if (edit) this.#chapter = applyEdit(this.#chapter, edit);
    this.#written = blocks;
    for (const listener of this.#listeners) listener();
    return this.#chapter;
  }
}
