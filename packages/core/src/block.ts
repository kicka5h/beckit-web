import { newBlockId, type BlockId } from "./ids.ts";

/** The single list of block kinds Beckit understands. Editor and storage both derive from it. */
export const BLOCK_TYPES = ["paragraph", "heading", "sceneBreak"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** Heading levels a chapter may use. */
export const HEADING_LEVELS = [1, 2, 3] as const;

/** The single list of inline styles Beckit stores. */
export const MARK_TYPES = ["bold", "italic"] as const;
export type MarkType = (typeof MARK_TYPES)[number];

/** A styled range within a block's text, in UTF-16 offsets, end exclusive. */
export interface MarkSpan {
  readonly type: MarkType;
  readonly start: number;
  readonly end: number;
}

interface BlockBase {
  readonly id: BlockId;
  readonly text: string;
  readonly marks: readonly MarkSpan[];
}

/** Editor-agnostic, storage-agnostic view of one block. Only headings have a level. */
export type BlockSnapshot =
  | (BlockBase & { readonly type: "heading"; readonly level: number })
  | (BlockBase & { readonly type: Exclude<BlockType, "heading"> });

/** Loose block fields, as read from storage or the editor. */
export interface BlockFields extends BlockBase {
  readonly type: BlockType;
  readonly level?: number | undefined;
}

/** The one place a level is attached to (or dropped from) a block. */
export function toSnapshot({ id, type, level, text, marks }: BlockFields): BlockSnapshot {
  return type === "heading"
    ? { id, type, level: level ?? HEADING_LEVELS[0], text, marks }
    : { id, type, text, marks };
}

/** The level of a heading, or undefined for any other block. */
export const levelOf = (block: BlockSnapshot): number | undefined =>
  block.type === "heading" ? block.level : undefined;

/** True for the mark names Beckit stores. */
export const isMarkType = (name: string): name is MarkType =>
  (MARK_TYPES as readonly string[]).includes(name);

interface NewBlockOptions {
  readonly type?: BlockType;
  readonly level?: number;
  readonly marks?: readonly MarkSpan[];
}

/** A new block with a freshly minted id. */
export const newBlock = (text: string, options: NewBlockOptions = {}): BlockSnapshot =>
  toSnapshot({
    id: newBlockId(),
    type: options.type ?? "paragraph",
    level: options.level,
    text,
    marks: options.marks ?? [],
  });
