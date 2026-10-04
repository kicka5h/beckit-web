import { isBlockId, resolveBlockIds, type BlockId, type PreviousBlock } from "@beckit/core";
import { Extension } from "@tiptap/core";
import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";
import { ID_NODE_TYPES } from "./schema.ts";

const ID_ATTR = "id";
const DOM_ATTR = "data-block-id";

interface Placed {
  readonly node: PMNode;
  readonly pos: number;
}

/** The permanent id an editor block carries, or null if it has none yet. */
export const blockIdOf = (node: PMNode): BlockId | null => {
  const id: unknown = node.attrs[ID_ATTR];
  return isBlockId(id) ? id : null;
};

/** Where a block's text lives in the document: just inside its opening token. */
const textRange = ({ node, pos }: Placed) => ({ from: pos + 1, to: pos + 1 + node.content.size });

/** Top-level blocks that touch [from, to], edges included. */
function blocksIn(doc: PMNode, from: number, to: number): Placed[] {
  const found: Placed[] = [];
  doc.forEach((node, pos) => {
    if (pos <= to && pos + node.nodeSize >= from) found.push({ node, pos });
  });
  return found;
}

/** The part of the final document that `mapping` changed, or null if only attributes changed. */
function changedRange(mapping: Mapping): { from: number; to: number } | null {
  let from = Infinity;
  let to = -Infinity;
  mapping.maps.forEach((map, index) => {
    const later = mapping.slice(index + 1);
    map.forEach((_oldFrom, _oldTo, newFrom, newTo) => {
      from = Math.min(from, later.map(newFrom, -1));
      to = Math.max(to, later.map(newTo, 1));
    });
  });
  return from <= to ? { from, to } : null;
}

/** Answers "is this id held by a block outside `inside`?", scanning the document only if asked. */
function heldOutside(doc: PMNode, inside: readonly Placed[]): (id: BlockId) => boolean {
  const skip = new Set(inside.map((b) => b.node));
  let ids: Set<BlockId> | undefined;
  return (id) => {
    ids ??= idsIn(doc.content, (node) => !skip.has(node));
    return ids.has(id);
  };
}

/** Old blocks around the edit, with their text's new location. */
function previousBlocks(before: PMNode, mapping: Mapping, range: { from: number; to: number }) {
  const back = mapping.invert();
  return blocksIn(before, back.map(range.from, -1), back.map(range.to, 1)).flatMap(
    (block): PreviousBlock[] => {
      const id = blockIdOf(block.node);
      const { from, to } = textRange(block);
      // Text typed or pasted at either edge belongs to the edit, not to this block.
      return id ? [{ id, from: mapping.map(from, 1), to: mapping.map(to, -1) }] : [];
    },
  );
}

/**
 * After an edit, settles the id of every block it touched (see `resolveBlockIds`): ids follow
 * the bulk of their text. Only the edited blocks are examined, so typing touches one block.
 */
function settleIds(
  transactions: readonly Transaction[],
  before: PMNode,
  state: EditorState,
): Transaction | null {
  const mapping = new Mapping();
  for (const tr of transactions) mapping.appendMapping(tr.mapping);
  const range = changedRange(mapping);
  if (!range) return null;

  const current = blocksIn(state.doc, range.from, range.to);
  const ids = resolveBlockIds(
    previousBlocks(before, mapping, range),
    current.map((block) => ({ id: blockIdOf(block.node), ...textRange(block) })),
    heldOutside(state.doc, current),
  );
  const tr = state.tr;
  current.forEach(({ node, pos }, i) => {
    const id = ids[i];
    if (id && id !== blockIdOf(node)) tr.setNodeAttribute(pos, ID_ATTR, id);
  });
  return tr.docChanged ? tr : null;
}

function idsIn(fragment: Fragment, include: (node: PMNode) => boolean = () => true): Set<BlockId> {
  const ids = new Set<BlockId>();
  fragment.forEach((node) => {
    const id = blockIdOf(node);
    if (id && include(node)) ids.add(id);
  });
  return ids;
}

const withoutId = (node: PMNode): PMNode =>
  blockIdOf(node)
    ? node.type.create({ ...node.attrs, [ID_ATTR]: null }, node.content, node.marks)
    : node;

/**
 * Pasted blocks lose their ids (they may come from another chapter), except blocks the writer
 * just cut or dragged here: those are moves. If the original still exists, `settleIds` gives
 * the copy a new id anyway.
 */
function keepMovedIds(slice: Slice, moving: ReadonlySet<BlockId>): Slice {
  const nodes: PMNode[] = [];
  slice.content.forEach((node) => {
    const id = blockIdOf(node);
    nodes.push(id && moving.has(id) ? node : withoutId(node));
  });
  return new Slice(Fragment.fromArray(nodes), slice.openStart, slice.openEnd);
}

function blockIdPlugin(): Plugin {
  let moving = new Set<BlockId>();
  const rememberSelection = (view: { state: EditorState }): boolean => {
    moving = idsIn(view.state.selection.content().content);
    return false;
  };

  return new Plugin({
    key: new PluginKey("blockIds"),
    appendTransaction: (transactions, oldState, newState) =>
      settleIds(transactions, oldState.doc, newState),
    props: {
      handleDOMEvents: { cut: rememberSelection, dragstart: rememberSelection },
      transformPasted: (slice) => {
        const result = keepMovedIds(slice, moving);
        moving = new Set();
        return result;
      },
    },
  });
}

/** Gives every top-level block a permanent id that survives editing. */
export const BlockIds = Extension.create({
  name: "blockIds",

  addGlobalAttributes() {
    return [
      {
        types: ID_NODE_TYPES,
        attributes: {
          [ID_ATTR]: {
            default: null,
            parseHTML: (element) => element.getAttribute(DOM_ATTR),
            renderHTML: (attrs) => (attrs[ID_ATTR] ? { [DOM_ATTR]: attrs[ID_ATTR] as string } : {}),
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [blockIdPlugin()];
  },
});
