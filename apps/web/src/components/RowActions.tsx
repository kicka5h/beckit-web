import type { DocHandle } from "@automerge/automerge-repo";
import type { ReactElement } from "react";

import {
  endPlaceOf,
  type ManuscriptDoc,
  type OutlineEntry,
  PARTS,
  stepPlaceOf,
  TREE_STEPS,
} from "@beckit/core";

import { moveByStep, moveTo, remove } from "../project/tree-actions.ts";
import { PART_LABELS, STEP_LABELS } from "./outline-labels.ts";

/** Props for `RowActions`. */
export interface RowActionsProps {
  readonly manuscript: DocHandle<ManuscriptDoc>;
  readonly entry: OutlineEntry;
  /** Called after any action, so the menu can close. */
  readonly onDone: () => void;
  readonly onRename: () => void;
}

/** Whether removing a node loses visible work, so the writer should confirm first. */
function shouldConfirmRemoval({ node }: OutlineEntry): boolean {
  if (node.kind === "section") return node.children.length > 0;
  return node.kind === "piece" && node.words > 0;
}

/**
 * The actions under a row's menu button: rename, move one step, move to another part, remove.
 * Every move works by tap, so the tree can be arranged on a phone, where dragging can't reach.
 */
export function RowActions({ manuscript, entry, onDone, onRename }: RowActionsProps): ReactElement {
  const { id, part, node } = entry;
  const doc = manuscript.doc();

  function thenClose(action: () => void): () => void {
    return () => {
      action();
      onDone();
    };
  }

  function removeAfterConfirming(): void {
    const message = `Remove “${node.title}”? Its text stays on this device.`;
    if (!shouldConfirmRemoval(entry) || window.confirm(message)) remove(manuscript, id);
  }

  return (
    <div className="row-actions" role="menu">
      <button type="button" role="menuitem" onClick={thenClose(onRename)}>
        Rename
      </button>
      {TREE_STEPS.filter((step) => stepPlaceOf(doc, id, step)).map((step) => (
        <button
          key={step}
          type="button"
          role="menuitem"
          onClick={thenClose(() => {
            moveByStep(manuscript, id, step);
          })}
        >
          {STEP_LABELS[step]}
        </button>
      ))}
      {PARTS.filter((other) => other !== part).map((other) => (
        <button
          key={other}
          type="button"
          role="menuitem"
          onClick={thenClose(() => {
            moveTo(manuscript, id, endPlaceOf(doc, other));
          })}
        >
          To {PART_LABELS[other].toLowerCase()}
        </button>
      ))}
      <button
        type="button"
        role="menuitem"
        className="row-actions__remove"
        onClick={thenClose(removeAfterConfirming)}
      >
        Remove
      </button>
    </div>
  );
}
