import type { ReactElement } from "react";

/** Props for `Header`. */
export interface HeaderProps {
  readonly title: string;
  readonly wordCount: number;
}

/** The faint bar above the page: chapter title, word count and save status. */
export function Header({ title, wordCount }: HeaderProps): ReactElement {
  return (
    <header className="header">
      <span>{title}</span>
      <div className="header__meta">
        <span>{wordCount.toLocaleString()} words</span>
        <span className="header__status" title="Storage arrives in milestone 2">
          Preview: not saved yet
        </span>
      </div>
    </header>
  );
}
