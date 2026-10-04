import type { DocHandle } from "@automerge/automerge-repo";
import { type DragEvent, type ReactElement, useState } from "react";

import type { ManuscriptDoc, NodeId, OutlineEntry } from "@beckit/core";

import { rename } from "../project/tree-actions.ts";
import { allowNodeDrop, droppedNodeOf, startNodeDrag } from "./outline-drag.ts";
import { depthClassOf } from "./outline-labels.ts";
import { RowActions } from "./RowActions.tsx";
import { RowLine } from "./RowLine.tsx";

/** Props for `OutlineRow`. */
export interface OutlineRowProps {
  readonly manuscript: DocHandle<ManuscriptDoc>;
  readonly entry: OutlineEntry;
  readonly isCurrent: boolean;
  readonly onOpen: (nodeId: NodeId) => void;
  /** Called when another row is dropped on this one; a section takes it inside. */
  readonly onDropRow: (draggedId: NodeId, target: OutlineEntry) => void;
}

/** One section or page in the outline: opens on tap, drags to reorder, and has a menu of moves. */
export function OutlineRow({
  manuscript,
  entry,
  isCurrent,
  onOpen,
  onDropRow,
}: OutlineRowProps): ReactElement {
  const { id, node, depth } = entry;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  function handleDrop(event: DragEvent): void {
    const dragged = droppedNodeOf(event);
    if (dragged && dragged !== id) onDropRow(dragged, entry);
  }

  const rowClass = `row row--${node.kind} ${depthClassOf("row", depth)}`;
  return (
    <li className={isCurrent ? `${rowClass} row--current` : rowClass}>
      <div
        className="row__line"
        draggable={!isRenaming}
        onDragStart={(event) => {
          startNodeDrag(event, id);
        }}
        onDragOver={allowNodeDrop}
        onDrop={handleDrop}
      >
        <RowLine
          title={node.title}
          isRenaming={isRenaming}
          canOpen={node.kind !== "section"}
          isMenuOpen={isMenuOpen}
          onOpen={() => {
            onOpen(id);
          }}
          onRenamed={(title) => {
            rename(manuscript, id, title);
            setIsRenaming(false);
          }}
          onToggleMenu={() => {
            setIsMenuOpen(!isMenuOpen);
          }}
        />
      </div>
      {isMenuOpen && (
        <RowActions
          manuscript={manuscript}
          entry={entry}
          onDone={() => {
            setIsMenuOpen(false);
          }}
          onRename={() => {
            setIsRenaming(true);
          }}
        />
      )}
    </li>
  );
}
