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
export {
  applyEdit,
  createChapter,
  createChapterDoc,
  readChapter,
  toInitialEdit,
  writeEdit,
} from "./chapter.ts";
export { diffEdit } from "./edit.ts";
export type { Format, FormatPage, PlannedPage } from "./formats.ts";
export {
  BLANK_FORMAT,
  firstTitleOf,
  formatOf,
  FORMATS,
  groupTitleOf,
  pieceTitleOf,
  planProject,
  UNTITLED,
} from "./formats.ts";
export type { BlockId, CurrentBlock, PreviousBlock } from "./ids.ts";
export { isBlockId, resolveBlockIds } from "./ids.ts";
export type {
  ContentsNode,
  Manuscript,
  ManuscriptDoc,
  ManuscriptNode,
  NodeId,
  OutlineEntry,
  Parent,
  Part,
  PieceEntry,
  PieceNode,
  Place,
  SectionNode,
  TreeStep,
} from "./manuscript.ts";
export {
  childIdsOf,
  countProjectWords,
  createManuscriptDoc,
  createNodeId,
  createPieceNode,
  endPlaceOf,
  findPlace,
  insertNode,
  isNodeId,
  isPart,
  moveNode,
  outlineOf,
  PARTS,
  piecesOf,
  removeNode,
  renameNode,
  repeatScopeOf,
  sectionOf,
  stepPlaceOf,
  TREE_STEPS,
  writePieceWords,
} from "./manuscript.ts";
export type { Segment } from "./marks.ts";
export { toSegments, toSpans } from "./marks.ts";
export { memoize } from "./memoize.ts";
export type { PassageStats, ReadingLevel } from "./readability.ts";
export { measureBlocks, measureText, readingLevelOf } from "./readability.ts";
export type { Span } from "./span.ts";
export { wordsOf } from "./text.ts";
export type { WordFormCount } from "./word-forms.ts";
export { countWordForms } from "./word-forms.ts";
