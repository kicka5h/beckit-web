import type { ReactElement } from "react";

import type { DeviceSettings } from "../device/device-settings.ts";
import { useDoc } from "../hooks/use-doc.ts";
import { useSidebar } from "../hooks/use-sidebar.ts";
import type { OpenProject, OpenTarget } from "../project/open-project.ts";
import { ContentsView } from "./ContentsView.tsx";
import { HomeScreenHint } from "./HomeScreenHint.tsx";
import { PieceView } from "./PieceView.tsx";
import { Sidebar } from "./Sidebar.tsx";

/** Whether the outline covers the page rather than sitting beside it, as on a phone. */
function isOutlineOverlaying(): boolean {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--outline-overlays");
  return value.trim() === "1";
}

/** Props for `Workspace`. */
export interface WorkspaceProps {
  readonly project: OpenProject;
  readonly settings: DeviceSettings;
  readonly onOpen: (target: OpenTarget) => void;
}

/** The open page with the project outline beside it, opened from the title in the header. */
export function Workspace({ project, settings, onOpen }: WorkspaceProps): ReactElement {
  const doc = useDoc(project.manuscript);
  const sidebar = useSidebar(settings);

  function openFromOutline(target: OpenTarget): void {
    if (isOutlineOverlaying()) sidebar.show(false);
    onOpen(target);
  }
  const { nodeId, chapter, manuscript, repo } = project;
  const title = doc.nodes[nodeId]?.title ?? "";
  return (
    <div className={sidebar.isOpen ? "workspace workspace--outline" : "workspace"}>
      {sidebar.isOpen && (
        <Sidebar
          project={project}
          doc={doc}
          onOpen={openFromOutline}
          onClose={() => {
            sidebar.show(false);
          }}
        />
      )}
      <div className="workspace__page">
        {chapter ? (
          <PieceView
            key={nodeId}
            repo={repo}
            manuscript={manuscript}
            doc={doc}
            pieceId={nodeId}
            title={title}
            chapter={chapter}
            flush={() => repo.flush([chapter.documentId])}
            settings={settings}
            onTitleClick={sidebar.toggle}
          />
        ) : (
          <ContentsView
            manuscript={doc}
            title={title}
            onOpen={(id) => {
              onOpen({ nodeId: id });
            }}
            onTitleClick={sidebar.toggle}
          />
        )}
        <HomeScreenHint settings={settings} />
      </div>
    </div>
  );
}
