import type { DocHandle } from "@automerge/automerge-repo";

import {
  type BlockSnapshot,
  type ChapterDoc,
  diffEdit,
  readChapter,
  writeEdit,
} from "@beckit/core";

/** A function that reads the editor's current blocks, called once per save rather than per keystroke. */
type ReadBlocks = () => readonly BlockSnapshot[];

/** Whether the latest edit is safely stored on this device. */
export type SaveStatus = "saving" | "saved" | "failed";

/** Options for `ChapterSession`. */
export interface ChapterSessionOptions {
  /** How long typing must pause before the edit is written. */
  readonly delayMilliseconds?: number;
  /** Resolves once everything written so far is in device storage. */
  readonly flush?: () => Promise<void>;
}

const DEFAULT_DELAY_MILLISECONDS = 400;

/**
 * The owner of one open chapter. The editor reports each change; the session waits for a pause in
 * typing, then reads the blocks once and writes one Automerge change, so history stays compact
 * and keystrokes stay cheap. It is also a React external store (`subscribe`, `blocks`, `status`).
 */
export class ChapterSession {
  readonly #handle: DocHandle<ChapterDoc>;
  readonly #delayMilliseconds: number;
  readonly #flush: () => Promise<void>;
  readonly #listeners = new Set<() => void>();
  #written: readonly BlockSnapshot[];
  #status: SaveStatus = "saved";
  #pending: ReadBlocks | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #saveCount = 0;

  constructor(handle: DocHandle<ChapterDoc>, options: ChapterSessionOptions = {}) {
    const { delayMilliseconds = DEFAULT_DELAY_MILLISECONDS, flush = () => Promise.resolve() } =
      options;
    this.#handle = handle;
    this.#delayMilliseconds = delayMilliseconds;
    this.#flush = flush;
    this.#written = readChapter(handle.doc());
  }

  /** Blocks as of the last save. Stable between saves, as React stores require. */
  get blocks(): readonly BlockSnapshot[] {
    return this.#written;
  }

  /** Whether the latest edit is stored on this device yet. */
  get status(): SaveStatus {
    return this.#status;
  }

  /** Registers a listener called after each save or status change; returns its remover. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Records that the editor changed; `read` is called once, when the change is saved. */
  update(read: ReadBlocks): void {
    this.#pending = read;
    this.#setStatus("saving");
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.save();
    }, this.#delayMilliseconds);
  }

  /** Writes any pending change now, then confirms it reached device storage. */
  save(): void {
    clearTimeout(this.#timer);
    const read = this.#pending;
    if (!read) return;
    this.#pending = undefined;

    const blocks = read();
    const edit = diffEdit(this.#written, blocks);
    if (edit) {
      this.#handle.change((doc) => {
        writeEdit(doc, edit);
      });
    }
    this.#written = blocks;
    this.#notify();
    void this.#confirmStored();
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }

  #setStatus(status: SaveStatus): void {
    if (this.#status === status) return;
    this.#status = status;
    this.#notify();
  }

  /** Marks the chapter saved once storage has it, unless a newer edit arrived meanwhile. */
  async #confirmStored(): Promise<void> {
    const saveCount = ++this.#saveCount;
    try {
      await this.#flush();
    } catch (error) {
      console.error("Could not store the chapter on this device", error);
      this.#setStatus("failed");
      return;
    }
    if (saveCount === this.#saveCount && !this.#pending) this.#setStatus("saved");
  }
}
