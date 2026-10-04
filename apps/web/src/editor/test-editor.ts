import { Editor } from "@tiptap/core";

import { type BlockId, type BlockSnapshot, createBlock } from "@beckit/core";

import { blockIdOf } from "./block-ids.ts";
import { extensions } from "./extensions.ts";
import { childrenOf, type PlacedNode, textSpanOf } from "./nodes.ts";
import { toDocJson } from "./snapshot.ts";

function blockAt(editor: Editor, index: number): PlacedNode {
  const block = childrenOf(editor.state.doc)[index];
  if (!block) throw new Error(`No block at index ${String(index)}`);
  return block;
}

/** Creates a live editor over the given paragraphs or blocks, for tests. */
export function createTestEditor(blocks: readonly (string | BlockSnapshot)[]): Editor {
  const snapshots = blocks.map((block) => (typeof block === "string" ? createBlock(block) : block));
  return new Editor({
    element: document.createElement("div"),
    extensions: [...extensions],
    content: toDocJson(snapshots),
  });
}

/** Each block's id, in document order. */
export function idsOf(editor: Editor): (BlockId | undefined)[] {
  return childrenOf(editor.state.doc).map(({ node }) => blockIdOf(node));
}

/** Each block's text, in document order. */
export function textsOf(editor: Editor): string[] {
  return childrenOf(editor.state.doc).map(({ node }) => node.textContent);
}

/** The document position just before block `index`, where a whole-block selection starts. */
export function blockPositionOf(editor: Editor, index: number): number {
  return blockAt(editor, index).pos;
}

/** The document position `offset` characters into block `index`. */
export function positionOf(editor: Editor, index: number, offset = 0): number {
  const { start, end } = textSpanOf(blockAt(editor, index));
  return Math.min(start + offset, end);
}

/** Places the caret `offset` characters into block `index`. */
export function placeCaret(editor: Editor, index: number, offset = 0): void {
  editor.commands.setTextSelection(positionOf(editor, index, offset));
}

/** Selects the document from `start` to `end`. */
export function selectRange(editor: Editor, start: number, end: number): void {
  editor.commands.setTextSelection({ from: start, to: end });
}

/** Cuts a range as the writer would and returns the clipboard HTML. */
export function cutRange(editor: Editor, start: number, end: number): string {
  selectRange(editor, start, end);
  const slice = editor.state.selection.content();
  editor.view.dom.dispatchEvent(new Event("cut"));
  editor.commands.deleteSelection();
  return editor.view.serializeForClipboard(slice).dom.innerHTML;
}

/** Runs a key through the editor's keymap, as if pressed. */
export function press(editor: Editor, key: string): boolean {
  return editor.commands.keyboardShortcut(key);
}

/** Throws unless every block has an id and no id appears twice. */
export function expectValidIds(editor: Editor): void {
  const ids = idsOf(editor);
  if (ids.includes(undefined)) throw new Error(`Block without id: ${JSON.stringify(ids)}`);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate id: ${JSON.stringify(ids)}`);
}
