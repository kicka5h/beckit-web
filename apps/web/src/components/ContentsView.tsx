import type { ReactElement } from "react";

import { type ManuscriptDoc, type NodeId, outlineOf } from "@beckit/core";

import { Header } from "./Header.tsx";
import { depthClassOf } from "./outline-labels.ts";

/** Props for `ContentsView`. */
export interface ContentsViewProps {
  readonly manuscript: ManuscriptDoc;
  readonly title: string;
  readonly onOpen: (nodeId: NodeId) => void;
  readonly onTitleClick: () => void;
}

/**
 * A contents page, drawn from the tree rather than typed: every section and piece of the body and
 * back matter, in order. It is never out of date.
 */
export function ContentsView({
  manuscript,
  title,
  onOpen,
  onTitleClick,
}: ContentsViewProps): ReactElement {
  const entries = outlineOf(manuscript).filter(
    ({ part, node }) => part !== "front" && node.kind !== "contents",
  );
  return (
    <>
      <Header title={title} onTitleClick={onTitleClick} />
      <main className="page">
        <h1 className="contents__title">{title}</h1>
        <ol className="contents">
          {entries.map(({ id, node, depth }) => (
            <li key={id} className={`contents__entry ${depthClassOf("contents__entry", depth)}`}>
              {node.kind === "piece" ? (
                <button
                  type="button"
                  className="contents__link"
                  onClick={() => {
                    onOpen(id);
                  }}
                >
                  {node.title}
                </button>
              ) : (
                <span className="contents__group">{node.title}</span>
              )}
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
