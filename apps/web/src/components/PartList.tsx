import type { DocHandle, Repo } from "@automerge/automerge-repo";
import type { ReactElement } from "react";

import {
  type Format,
  type ManuscriptDoc,
  type NodeId,
  type OutlineEntry,
  type Part,
  piecesOf,
} from "@beckit/core";

import { addPiece, addSection } from "../project/tree-actions.ts";
import { allowNodeDrop, droppedNodeOf } from "./outline-drag.ts";
import { OutlineRow } from "./OutlineRow.tsx";
import { PartAddButtons } from "./PartAddButtons.tsx";
import { PART_LABELS } from "./RowActions.tsx";

/** Props for `PartList`. */
export interface PartListProps {
  readonly repo: Repo;
  readonly manuscript: DocHandle<ManuscriptDoc>;
  readonly doc: ManuscriptDoc;
  readonly part: Part;
  readonly entries: readonly OutlineEntry[];
  readonly format: Format;
  readonly currentId: NodeId;
  readonly onOpen: (nodeId: NodeId) => void;
  readonly onDropRow: (draggedId: NodeId, target: OutlineEntry | Part) => void;
}

const NEW_PAGE_TITLE = "New page";

/**
 * One part of the outline (front matter, body or back matter) with its rows, and buttons to add a
 * page, or in the body a piece or a group, at its end.
 */
export function PartList({
  repo,
  manuscript,
  doc,
  part,
  entries,
  format,
  currentId,
  onOpen,
  onDropRow,
}: PartListProps): ReactElement {
  const place = { parent: part, index: doc[part].length };
  const isBody = part === "body";
  const pieceTitle = isBody
    ? `${format.unit} ${String(piecesOf(doc, "body").length + 1)}`
    : NEW_PAGE_TITLE;
  const sectionCount = entries.filter(({ node }) => node.kind === "section").length;
  const sectionTitle = `${format.group} ${String(sectionCount + 1)}`;

  return (
    <section className="part">
      <h2
        className="part__heading"
        onDragOver={allowNodeDrop}
        onDrop={(event) => {
          const dragged = droppedNodeOf(event);
          if (dragged) onDropRow(dragged, part);
        }}
      >
        {PART_LABELS[part]}
      </h2>
      <ul className="part__rows">
        {entries.map((entry) => (
          <OutlineRow
            key={entry.id}
            manuscript={manuscript}
            entry={entry}
            isCurrent={entry.id === currentId}
            onOpen={onOpen}
            onDropRow={onDropRow}
          />
        ))}
      </ul>
      <PartAddButtons
        addLabel={isBody ? format.unit.toLowerCase() : "page"}
        groupLabel={isBody ? format.group.toLowerCase() : undefined}
        onAddPiece={() => {
          onOpen(addPiece(repo, manuscript, place, pieceTitle));
        }}
        onAddGroup={() => {
          addSection(manuscript, place, sectionTitle);
        }}
      />
    </section>
  );
}
