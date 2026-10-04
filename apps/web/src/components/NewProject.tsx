import type { ReactElement } from "react";

import { type Format, FORMATS } from "@beckit/core";

/** Props for `NewProject`. */
export interface NewProjectProps {
  readonly onChoose: (format: Format) => void;
  readonly onCancel: () => void;
}

function describe({ front, back, unit }: Format): string {
  const pages = [...front, ...back].map(({ title }) => title.toLowerCase());
  return pages.length > 0
    ? `${unit}s, with ${pages.join(", ")}`
    : "An empty page, nothing pre-made";
}

/** The choice of format a new project starts from. Everything a format makes stays editable. */
export function NewProject({ onChoose, onCancel }: NewProjectProps): ReactElement {
  return (
    <div className="new-project">
      <h2 className="new-project__heading">Start a new project</h2>
      <ul className="new-project__formats">
        {FORMATS.map((format) => (
          <li key={format.id}>
            <button
              type="button"
              className="new-project__format"
              onClick={() => {
                onChoose(format);
              }}
            >
              <span className="new-project__name">{format.name}</span>
              <span className="new-project__pages">{describe(format)}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="new-project__cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
