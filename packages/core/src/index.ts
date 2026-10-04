// The public API of @beckit/core. Anything not listed here is internal (see STYLE.md).
// Changing this list, or any signature it exposes, must update api/core.api.md.

export type {
  BlockBase,
  BlockFields,
  BlockSnapshot,
  BlockType,
  CreateBlockOptions,
  MarkSpan,
  MarkType,
} from "./block.ts";
export {
  BLOCK_TYPES,
  createBlock,
  HEADING_LEVELS,
  isMarkType,
  levelOf,
  MARK_TYPES,
  toSnapshot,
} from "./block.ts";
export type { Chapter, ChapterDoc, ChapterEdit, StoredBlock } from "./chapter.ts";
export { applyEdit, createChapter, readChapter } from "./chapter.ts";
export { diffEdit } from "./edit.ts";
export type { BlockId, CurrentBlock, PreviousBlock } from "./ids.ts";
export { isBlockId, resolveBlockIds } from "./ids.ts";
export type { Segment } from "./marks.ts";
export { toSegments, toSpans } from "./marks.ts";
export { memoize } from "./memoize.ts";
export type { Span } from "./span.ts";
export { countBlockWords, countWords } from "./text.ts";
