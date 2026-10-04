import type { ReactElement } from "react";

import type { AppUpdate } from "../device/app-update.ts";

/** Props for `UpdatePrompt`. */
export interface UpdatePromptProps {
  readonly update: AppUpdate;
}

/** The note offering a newer version of Beckit once it has downloaded; reloading installs it. */
export function UpdatePrompt({ update }: UpdatePromptProps): ReactElement {
  return (
    <aside className="hint">
      <span>A new version of Beckit is ready.</span>
      <button
        type="button"
        className="control hint__action"
        onClick={() => {
          void update.install();
        }}
      >
        Reload
      </button>
    </aside>
  );
}
