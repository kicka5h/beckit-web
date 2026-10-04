import { type ReactElement, useState } from "react";

import type { Format } from "@beckit/core";

import { useDoc } from "../hooks/use-doc.ts";
import { useProjectTitles } from "../hooks/use-project-titles.ts";
import { createProject } from "../project/create-project.ts";
import type { OpenProject, OpenTarget } from "../project/open-project.ts";
import { NewProject } from "./NewProject.tsx";

/** Props for `ProjectSwitcher`. */
export interface ProjectSwitcherProps {
  readonly project: OpenProject;
  readonly onOpen: (target: OpenTarget) => void;
}

/** The writer's other projects on this device, and the way to start a new one from a format. */
export function ProjectSwitcher({ project, onOpen }: ProjectSwitcherProps): ReactElement {
  const { repo, library, manuscript } = project;
  const [isChoosing, setIsChoosing] = useState(false);
  const others = useDoc(library).projects.filter((url) => url !== manuscript.url);
  const titles = useProjectTitles(repo, others);

  function start(format: Format): void {
    const created = createProject(repo, format);
    setIsChoosing(false);
    onOpen({ manuscriptUrl: created.manuscript.url, nodeId: created.firstPieceId });
  }

  if (isChoosing) {
    return (
      <NewProject
        onChoose={start}
        onCancel={() => {
          setIsChoosing(false);
        }}
      />
    );
  }
  return (
    <section className="list">
      {others.length > 0 && <h2 className="list__heading">Other projects</h2>}
      <ul className="list__rows">
        {others.map((url) => (
          <li key={url} className="row">
            <button
              type="button"
              className="row__title"
              onClick={() => {
                onOpen({ manuscriptUrl: url });
              }}
            >
              {titles.get(url) ?? "…"}
            </button>
          </li>
        ))}
      </ul>
      <div className="list__actions">
        <button
          type="button"
          onClick={() => {
            setIsChoosing(true);
          }}
        >
          New project
        </button>
      </div>
    </section>
  );
}
