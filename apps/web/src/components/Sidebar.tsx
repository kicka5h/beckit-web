import { type ReactElement, useContext } from "react";

import {
  endPlaceOf,
  findPlace,
  formatOf,
  type ManuscriptDoc,
  type NodeId,
  type OutlineEntry,
  outlineOf,
  type Part,
  PARTS,
  type Place,
} from "@beckit/core";

import type { OpenProject, OpenTarget } from "../project/open-project.ts";
import { moveTo, renameProject } from "../project/tree-actions.ts";
import { SyncContext } from "../sync/sync-context.ts";
import { AccountPanel } from "./AccountPanel.tsx";
import { PartList } from "./PartList.tsx";
import { ProjectSwitcher } from "./ProjectSwitcher.tsx";

/** Props for `Sidebar`. */
export interface SidebarProps {
  readonly project: OpenProject;
  readonly doc: ManuscriptDoc;
  readonly onOpen: (target: OpenTarget) => void;
  readonly onClose: () => void;
}

/** Where a row dropped on `target` lands: inside a section, before a page, at the end of a part. */
function dropPlaceOf(doc: ManuscriptDoc, target: OutlineEntry | Part): Place | undefined {
  if (typeof target === "string") return endPlaceOf(doc, target);
  if (target.node.kind === "section") return endPlaceOf(doc, target.id);
  return findPlace(doc, target.id);
}

/**
 * The project outline: its title, the tree of front matter, body and back matter, and the other
 * projects. Rows open on tap, drag to reorder, and carry a menu of moves for touch screens.
 */
export function Sidebar({ project, doc, onOpen, onClose }: SidebarProps): ReactElement {
  const services = useContext(SyncContext);
  const outline = outlineOf(doc);
  const format = formatOf(doc.format);

  function openNode(nodeId: NodeId): void {
    onOpen({ nodeId });
  }

  function handleDropRow(draggedId: NodeId, target: OutlineEntry | Part): void {
    const place = dropPlaceOf(doc, target);
    if (place) moveTo(project.manuscript, draggedId, place);
  }

  return (
    <nav className="sidebar" aria-label="Project outline">
      <div className="sidebar__top">
        <input
          key={doc.title}
          className="field sidebar__project"
          defaultValue={doc.title}
          aria-label="Project title"
          onBlur={(event) => {
            renameProject(project.manuscript, event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <button type="button" className="control" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {PARTS.map((part) => (
        <PartList
          key={part}
          repo={project.repo}
          manuscript={project.manuscript}
          doc={doc}
          part={part}
          entries={outline.filter((entry) => entry.part === part)}
          format={format}
          currentId={project.nodeId}
          onOpen={openNode}
          onDropRow={handleDropRow}
        />
      ))}
      <ProjectSwitcher project={project} onOpen={onOpen} />
      {services && <AccountPanel accounts={services.accounts} sync={services.sync} />}
    </nav>
  );
}
