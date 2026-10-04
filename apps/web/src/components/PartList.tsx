import type { DocHandle, Repo } from "@automerge/automerge-repo";
import type { ReactElement } from "react";

import {
  endPlaceOf,
  type Format,
  groupTitleOf,
  type ManuscriptDoc,
  type NodeId,
  type OutlineEntry,
  type Part,
  piecesOf,
  pieceTitleOf,
} from "@beckit/core";

import { addPiece, addSection } from "../project/tree-actions.ts";
import { type AddChoice, AddMenu } from "./AddMenu.tsx";
import { allowNodeDrop, droppedNodeOf } from "./outline-drag.ts";
import { PART_LABELS } from "./outline-labels.ts";
import { OutlineRow } from "./OutlineRow.tsx";

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

/** What the "+" beside a part adds: a page, or in the body a piece or a group. */
function addChoicesOf({
  repo,
  manuscript,
  doc,
  part,
  entries,
  format,
  onOpen,
}: Omit<PartListProps, "currentId" | "onDropRow">): AddChoice[] {
  const place = endPlaceOf(doc, part);
  if (part !== "body") {
    return [
      {
        label: "Add page",
        onAdd: () => {
          onOpen(addPiece(repo, manuscript, place, NEW_PAGE_TITLE));
        },
      },
    ];
  }
  const pieceTitle = pieceTitleOf(format, piecesOf(doc, "body").length + 1);
  const sectionCount = entries.filter(({ node }) => node.kind === "section").length;
  const sectionTitle = groupTitleOf(format, sectionCount + 1);
  return [
    {
      label: `Add ${format.unit.toLowerCase()}`,
      onAdd: () => {
        onOpen(addPiece(repo, manuscript, place, pieceTitle));
      },
    },
    {
      label: `Add ${format.group.toLowerCase()}`,
      onAdd: () => {
        addSection(manuscript, place, sectionTitle);
      },
    },
  ];
}

/**
 * One part of the outline (front matter, body or back matter) with its rows, and a "+" beside its
 * heading that adds a page at its end, or in the body a piece or a group.
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
  const choices = addChoicesOf({ repo, manuscript, doc, part, entries, format, onOpen });

  return (
    <section className="part list">
      <div className="list__header">
        <h2
          className="list__heading"
          onDragOver={allowNodeDrop}
          onDrop={(event) => {
            const dragged = droppedNodeOf(event);
            if (dragged) onDropRow(dragged, part);
          }}
        >
          {PART_LABELS[part]}
        </h2>
        <AddMenu choices={choices} menuLabel={`Add to ${PART_LABELS[part]}`} />
      </div>
      <ul className="list__rows">
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
    </section>
  );
}
