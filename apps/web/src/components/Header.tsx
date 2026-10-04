import type { ReactElement } from "react";

import type { SaveStatus } from "../chapter/chapter-session.ts";

/** Props for `Header`. */
export interface HeaderProps {
  readonly title: string;
  readonly wordCount: number;
  readonly status: SaveStatus;
}

/** The plain words the header shows for each save status. */
const STATUS_LABELS = {
  saving: "Saving…",
  saved: "Saved on this device",
  failed: "Not saved: this device's storage refused it",
} as const satisfies Record<SaveStatus, string>;

/** The faint bar above the page: chapter title, word count and save status. */
export function Header({ title, wordCount, status }: HeaderProps): ReactElement {
  return (
    <header className="header">
      <span>{title}</span>
      <div className="header__meta">
        <span>{wordCount.toLocaleString()} words</span>
        <span className={`header__status header__status--${status}`} role="status">
          {STATUS_LABELS[status]}
        </span>
      </div>
    </header>
  );
}
