import type { DocHandle } from "@automerge/automerge-repo";
import type { ReactElement } from "react";

import {
  type ManuscriptDoc,
  type OutlineEntry,
  type Part,
  PARTS,
  placeAfterStep,
  type TreeStep,
} from "@beckit/core";

import { moveByStep, moveTo, remove } from "../project/tree-actions.ts";

/** Props for `RowActions`. */
export interface RowActionsProps {
  readonly manuscript: DocHandle<ManuscriptDoc>;
  readonly entry: OutlineEntry;
  /** Called after any action, so the menu can close. */
  readonly onDone: () => void;
  readonly onRename: () => void;
}

/** What each part is called in the outline. */
export const PART_LABELS = {
  front: "Front matter",
  body: "Body",
  back: "Back matter",
} as const satisfies Record<Part, string>;

/** The label of each one-step move. */
const STEP_LABELS = {
  up: "Move up",
  down: "Move down",
  in: "Into the section above",
  out: "Out of its section",
} as const satisfies Record<TreeStep, string>;

const STEPS: readonly TreeStep[] = ["up", "down", "in", "out"];

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

  function run(action: () => void): () => void {
    return () => {
      action();
      onDone();
    };
  }

  function confirmRemoval(): void {
    const message = `Remove “${node.title}”? Its text stays on this device.`;
    if (!shouldConfirmRemoval(entry) || window.confirm(message)) remove(manuscript, id);
  }

  return (
    <div className="row-actions" role="menu">
      <button type="button" role="menuitem" onClick={run(onRename)}>
        Rename
      </button>
      {STEPS.filter((step) => placeAfterStep(doc, id, step)).map((step) => (
        <button
          key={step}
          type="button"
          role="menuitem"
          onClick={run(() => {
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
          onClick={run(() => {
            moveTo(manuscript, id, { parent: other, index: doc[other].length });
          })}
        >
          To {PART_LABELS[other].toLowerCase()}
        </button>
      ))}
      <button
        type="button"
        role="menuitem"
        className="row-actions__remove"
        onClick={run(confirmRemoval)}
      >
        Remove
      </button>
    </div>
  );
}
