import type { DocHandle } from "@automerge/automerge-repo";

import {
  type BlockSnapshot,
  type ChapterDoc,
  diffEdit,
  readChapter,
  rebaseList,
  writeEdit,
} from "@beckit/core";

import { createListeners } from "../events/listeners.ts";

/** A function that reads the editor's current blocks, called once per save rather than per keystroke. */
type ReadBlocks = () => readonly BlockSnapshot[];

/** How far the latest edit has got toward this device's storage. */
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
 * and keystrokes stay cheap. Changes from other devices merge in: the session saves what was typed
 * here first, then hands the editor the merged blocks (`revision` moves). It is also a React
 * external store (`subscribe`, `blocks`, `status`, `revision`).
 */
export class ChapterSession {
  readonly #handle: DocHandle<ChapterDoc>;
  readonly #delayMilliseconds: number;
  readonly #flush: () => Promise<void>;
  readonly #listeners = createListeners();
  #written: readonly BlockSnapshot[];
  #revision = 0;
  #isWriting = false;
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
    handle.on("change", this.#mergeRemote);
  }

  /** Blocks as of the last save. Stable between saves, as React stores require. */
  get blocks(): readonly BlockSnapshot[] {
    return this.#written;
  }

  /** How far the latest edit has got toward this device's storage. */
  get status(): SaveStatus {
    return this.#status;
  }

  /** How many times changes from elsewhere have merged in; the editor reloads when it moves. */
  get revision(): number {
    return this.#revision;
  }

  /** Registers a listener called after each save, merge or status change; returns its remover. */
  readonly subscribe = (listener: () => void): (() => void) => this.#listeners.subscribe(listener);

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
      // The chapter may hold paragraphs added elsewhere since the editor last loaded: replay only
      // this device's reordering onto it, so none of them drops out.
      const base = this.#written.map(({ id }) => id);
      const current = readChapter(this.#handle.doc()).map(({ id }) => id);
      const order = rebaseList(base, edit.order, current);
      this.#isWriting = true;
      try {
        this.#handle.change((doc) => {
          writeEdit(doc, { ...edit, order });
        });
      } finally {
        this.#isWriting = false;
      }
    }
    this.#written = blocks;
    this.#notify();
    void this.#confirmStored();
  }

  /** Stops listening to the chapter; call after a last `save` when the piece closes. */
  close(): void {
    clearTimeout(this.#timer);
    this.#handle.off("change", this.#mergeRemote);
  }

  /** Takes in a change made elsewhere, after first writing what was typed here. */
  readonly #mergeRemote = (): void => {
    if (this.#isWriting) return;
    this.save();
    this.#written = readChapter(this.#handle.doc());
    this.#revision++;
    this.#notify();
  };

  #notify(): void {
    this.#listeners.notify();
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
