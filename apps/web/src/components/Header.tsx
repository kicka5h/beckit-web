import type { ReactElement, ReactNode } from "react";

import type { SaveStatus } from "../chapter/chapter-session.ts";

/** Props for `Header`. */
export interface HeaderProps {
  readonly title: string;
  readonly status: SaveStatus;
  readonly onTitleClick: () => void;
  /** Counts shown before the save status; none for a page with no text of its own. */
  readonly children?: ReactNode;
}

/** The plain words the header shows for each save status. */
const STATUS_LABELS = {
  saving: "Saving…",
  saved: "Saved on this device",
  failed: "Not saved: this device's storage refused it",
} as const satisfies Record<SaveStatus, string>;

/** The faint bar above the page: piece title (which opens the outline), counts and save status. */
export function Header({ title, status, onTitleClick, children }: HeaderProps): ReactElement {
  return (
    <header className="header">
      <button type="button" className="header__title" onClick={onTitleClick}>
        {title}
      </button>
      <div className="header__meta">
        {children}
        <span className={`header__status header__status--${status}`} role="status">
          {STATUS_LABELS[status]}
        </span>
      </div>
    </header>
  );
}
