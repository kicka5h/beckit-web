import { type BlockId, createBlockId } from "./ids.ts";
import type { Span } from "./span.ts";

/** The block kinds Beckit stores. Editor and storage both derive from this list. */
export const BLOCK_TYPES = ["paragraph", "heading", "sceneBreak"] as const;

/** Heading levels a chapter may use. */
export const HEADING_LEVELS = [1, 2, 3] as const;

/** The inline styles Beckit stores. */
export const MARK_TYPES = ["bold", "italic"] as const;

/** One of the block kinds in `BLOCK_TYPES`. */
export type BlockType = (typeof BLOCK_TYPES)[number];

/** One of the inline styles in `MARK_TYPES`. */
export type MarkType = (typeof MARK_TYPES)[number];

/** A styled range within a block's text, in UTF-16 offsets. */
export interface MarkSpan extends Span {
  readonly type: MarkType;
}

/** Fields every block has, whatever its type. */
export interface BlockBase {
  readonly id: BlockId;
  readonly text: string;
  readonly marks: readonly MarkSpan[];
}

/** Editor-agnostic, storage-agnostic view of one block. Only headings have a level. */
export type BlockSnapshot =
  | (BlockBase & { readonly type: "heading"; readonly level: number })
  | (BlockBase & { readonly type: Exclude<BlockType, "heading"> });

/** Block fields as read from storage or the editor, before the level rule is applied. */
export interface BlockFields extends BlockBase {
  readonly type: BlockType;
  readonly level: number | undefined;
}

/** Options for `createBlock`. */
export interface CreateBlockOptions {
  readonly type?: BlockType;
  readonly level?: number;
  readonly marks?: readonly MarkSpan[];
}

/** Builds a snapshot from loose fields. The one place a level is attached or dropped. */
export function toSnapshot({ id, type, level, text, marks }: BlockFields): BlockSnapshot {
  return type === "heading"
    ? { id, type, level: level ?? HEADING_LEVELS[0], text, marks }
    : { id, type, text, marks };
}

/** The level of a heading, or undefined for any other block. */
export function levelOf(block: BlockSnapshot): number | undefined {
  return block.type === "heading" ? block.level : undefined;
}

/** Whether a mark name is one Beckit stores. */
export function isMarkType(name: string): name is MarkType {
  return (MARK_TYPES as readonly string[]).includes(name);
}

/** Creates a block with a newly minted id. */
export function createBlock(text: string, options: CreateBlockOptions = {}): BlockSnapshot {
  const { type = "paragraph", level, marks = [] } = options;
  return toSnapshot({ id: createBlockId(), type, level, text, marks });
}
