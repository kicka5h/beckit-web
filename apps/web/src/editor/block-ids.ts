import { Extension } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode, Slice } from "@tiptap/pm/model";
import { type EditorState, Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";

import {
  type BlockId,
  isBlockId,
  type PreviousBlock,
  resolveBlockIds,
  type Span,
} from "@beckit/core";

import { childrenOf, type PlacedNode, textSpanOf } from "./nodes.ts";
import { ID_ATTRIBUTE, idNodeTypes } from "./schema.ts";

const DOM_ATTRIBUTE = "data-block-id";
const PLUGIN_NAME = "blockIds";

/** The permanent id an editor block carries, or undefined if it has none yet. */
export function blockIdOf(node: ProseMirrorNode): BlockId | undefined {
  const id: unknown = node.attrs[ID_ATTRIBUTE];
  return isBlockId(id) ? id : undefined;
}

/** Finds the top-level blocks that touch `span`, edges included. */
function findBlocks(doc: ProseMirrorNode, { start, end }: Span): PlacedNode[] {
  return childrenOf(doc).filter(({ node, pos }) => pos <= end && pos + node.nodeSize >= start);
}

function blockIdsOf(fragment: Fragment): Set<BlockId> {
  return new Set(childrenOf(fragment).flatMap(({ node }) => blockIdOf(node) ?? []));
}

/** The part of the final document that `mapping` changed; undefined if only attributes changed. */
function changedSpanOf(mapping: Mapping): Span | undefined {
  let start = Infinity;
  let end = -Infinity;
  for (const [index, stepMap] of mapping.maps.entries()) {
    const later = mapping.slice(index + 1);
    // ProseMirror exposes a step's changed ranges only through forEach.
    stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      start = Math.min(start, later.map(newStart, -1));
      end = Math.max(end, later.map(newEnd, 1));
    });
  }
  return start <= end ? { start, end } : undefined;
}

/** Creates a check for "is this id held by a block outside `inside`?" that scans the document only if asked. */
function createHeldOutsideCheck(
  doc: ProseMirrorNode,
  inside: readonly PlacedNode[],
): (id: BlockId) => boolean {
  const insideNodes = new Set(inside.map((block) => block.node));
  let outsideIds: Set<BlockId> | undefined;
  return (id) => {
    outsideIds ??= new Set(
      childrenOf(doc).flatMap(({ node }) => (insideNodes.has(node) ? [] : (blockIdOf(node) ?? []))),
    );
    return outsideIds.has(id);
  };
}

/** The old blocks around the edit, with where their text sits now. */
function previousBlocksOf(
  before: ProseMirrorNode,
  mapping: Mapping,
  { start: changedStart, end: changedEnd }: Span,
): PreviousBlock[] {
  const back = mapping.invert();
  const oldSpan = { start: back.map(changedStart, -1), end: back.map(changedEnd, 1) };
  return findBlocks(before, oldSpan).flatMap((block) => {
    const id = blockIdOf(block.node);
    const { start, end } = textSpanOf(block);
    // Text typed or pasted at either edge belongs to the edit, not to this block.
    return id ? [{ id, start: mapping.map(start, 1), end: mapping.map(end, -1) }] : [];
  });
}

/**
 * Settles the id of every block an edit touched (see `resolveBlockIds`): ids follow
 * the bulk of their text. Only the edited blocks are examined, so typing touches one block.
 */
function settleIds(
  transactions: readonly Transaction[],
  before: ProseMirrorNode,
  state: EditorState,
): Transaction | undefined {
  const mapping = new Mapping();
  for (const tr of transactions) mapping.appendMapping(tr.mapping);
  const changed = changedSpanOf(mapping);
  if (!changed) return undefined;

  const current = findBlocks(state.doc, changed);
  const ids = resolveBlockIds(
    previousBlocksOf(before, mapping, changed),
    current.map((block) => ({ id: blockIdOf(block.node), ...textSpanOf(block) })),
    createHeldOutsideCheck(state.doc, current),
  );
  const { tr } = state;
  for (const [index, { node, pos }] of current.entries()) {
    const id = ids[index];
    if (id && id !== blockIdOf(node)) tr.setNodeAttribute(pos, ID_ATTRIBUTE, id);
  }
  return tr.docChanged ? tr : undefined;
}

/** Copies `node` without its id. ProseMirror replaces the missing value with the default. */
function stripId(node: ProseMirrorNode): ProseMirrorNode {
  return node.type.create({ ...node.attrs, [ID_ATTRIBUTE]: undefined }, node.content, node.marks);
}

/**
 * Strips ids from pasted blocks (they may come from another chapter), except blocks the writer
 * just cut or dragged here: those are moves. If the original still exists, `settleIds` gives
 * the copy a new id anyway.
 */
function keepMovedIds(slice: Slice, moving: ReadonlySet<BlockId>): Slice {
  const nodes = childrenOf(slice.content).map(({ node }) => {
    const id = blockIdOf(node);
    return id && moving.has(id) ? node : stripId(node);
  });
  return new Slice(Fragment.fromArray(nodes), slice.openStart, slice.openEnd);
}

function createBlockIdPlugin(): Plugin {
  let moving = new Set<BlockId>();

  function rememberSelection(view: { readonly state: EditorState }): boolean {
    moving = blockIdsOf(view.state.selection.content().content);
    return false;
  }

  return new Plugin({
    key: new PluginKey(PLUGIN_NAME),
    appendTransaction: (transactions, oldState, newState) =>
      settleIds(transactions, oldState.doc, newState),
    props: {
      handleDOMEvents: { cut: rememberSelection, dragstart: rememberSelection },
      transformPasted: (slice) => {
        const kept = keepMovedIds(slice, moving);
        moving = new Set();
        return kept;
      },
    },
  });
}

/** The editor extension that gives every top-level block a permanent id that survives editing. */
export const BlockIds = Extension.create({
  name: PLUGIN_NAME,

  addGlobalAttributes() {
    return [
      {
        types: [...idNodeTypes],
        attributes: {
          [ID_ATTRIBUTE]: {
            // eslint-disable-next-line unicorn/no-null -- ProseMirror attributes need a non-undefined default
            default: null,
            parseHTML: (element) => element.getAttribute(DOM_ATTRIBUTE),
            renderHTML: (attributes) => {
              const id: unknown = attributes[ID_ATTRIBUTE];
              return isBlockId(id) ? { [DOM_ATTRIBUTE]: id } : {};
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [createBlockIdPlugin()];
  },
});
