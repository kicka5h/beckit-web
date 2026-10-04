import type { ReactElement } from "react";

import type { SaveStatus } from "../chapter/chapter-session.ts";

/** Props for `Header`. */
export interface HeaderProps {
  readonly title: string;
  /** Words in the open piece, or undefined for a page with no text of its own. */
  readonly wordCount: number | undefined;
  readonly status: SaveStatus;
  readonly onTitleClick: () => void;
}

/** The plain words the header shows for each save status. */
const STATUS_LABELS = {
  saving: "Saving…",
  saved: "Saved on this device",
  failed: "Not saved: this device's storage refused it",
} as const satisfies Record<SaveStatus, string>;

/** The faint bar above the page: piece title (which opens the outline), word count and save status. */
export function Header({ title, wordCount, status, onTitleClick }: HeaderProps): ReactElement {
  return (
    <header className="header">
      <button type="button" className="header__title" onClick={onTitleClick}>
        {title}
      </button>
      <div className="header__meta">
        {wordCount !== undefined && <span>{wordCount.toLocaleString()} words</span>}
        <span className={`header__status header__status--${status}`} role="status">
          {STATUS_LABELS[status]}
        </span>
      </div>
    </header>
  );
}
