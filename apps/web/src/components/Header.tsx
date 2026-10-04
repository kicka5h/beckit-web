import type { ReactElement } from "react";

interface HeaderProps {
  readonly title: string;
  readonly words: number;
}

export function Header({ title, words }: HeaderProps): ReactElement {
  return (
    <header className="header">
      <span>{title}</span>
      <div className="header__meta">
        <span>{words.toLocaleString()} words</span>
        <span className="status" title="Storage arrives in milestone 2">
          Preview: not saved yet
        </span>
      </div>
    </header>
  );
}
