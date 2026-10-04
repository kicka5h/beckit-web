import { newBlock, type BlockSnapshot } from "@beckit/core";
import { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { blockIdOf } from "./block-ids.ts";
import { extensions } from "./extensions.ts";
import { toDocJSON } from "./snapshot.ts";

/** Test helper: a live editor over the given paragraphs or blocks. */
export function makeEditor(blocks: readonly (string | BlockSnapshot)[]): Editor {
  const snapshots = blocks.map((b) => (typeof b === "string" ? newBlock(b) : b));
  return new Editor({
    element: document.createElement("div"),
    extensions,
    content: toDocJSON(snapshots),
  });
}

/** Maps every top-level block of the editor's document. */
function mapBlocks<T>(editor: Editor, map: (node: PMNode, pos: number) => T): T[] {
  const results: T[] = [];
  editor.state.doc.forEach((node, pos) => results.push(map(node, pos)));
  return results;
}

/** Each block's id, in document order. */
export const idsOf = (editor: Editor): (string | null)[] => mapBlocks(editor, blockIdOf);

/** Each block's text, in document order. */
export const textsOf = (editor: Editor): string[] => mapBlocks(editor, (node) => node.textContent);

/** Document position of `offset` characters into block `index`. */
export function posIn(editor: Editor, index: number, offset = 0): number {
  const block = mapBlocks(editor, (node, pos) => ({ pos, size: node.content.size }))[index];
  if (!block) throw new Error(`No block at index ${String(index)}`);
  return block.pos + 1 + Math.min(offset, block.size);
}

/** Places the cursor `offset` characters into block `index`. */
export function caretAt(editor: Editor, index: number, offset = 0): void {
  editor.commands.setTextSelection(posIn(editor, index, offset));
}

/** Runs a key through the editor's keymap, as if pressed. */
export const press = (editor: Editor, key: string): boolean =>
  editor.commands.keyboardShortcut(key);

/** Every block has an id and no id appears twice. */
export function expectValidIds(editor: Editor): void {
  const ids = idsOf(editor);
  if (ids.some((id) => id === null)) throw new Error(`Block without id: ${JSON.stringify(ids)}`);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate id: ${JSON.stringify(ids)}`);
}
