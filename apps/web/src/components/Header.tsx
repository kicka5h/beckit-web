import { type ReactElement, type ReactNode, useContext } from "react";

import type { SaveStatus } from "../chapter/chapter-session.ts";
import { useSyncState } from "../hooks/use-sync-state.ts";
import { SyncContext } from "../sync/sync-context.ts";
import { isSettled, statusLabelOf } from "./status-label.ts";

/** Props for `Header`. */
export interface HeaderProps {
  readonly title: string;
  /** How far the open piece's latest edit has got; none for a page with no text of its own. */
  readonly status?: SaveStatus;
  readonly onTitleClick: () => void;
  /** Counts shown before the status. */
  readonly children?: ReactNode;
}

/** The faint bar above the page: piece title (which opens the outline), counts and status. */
export function Header({ title, status, onTitleClick, children }: HeaderProps): ReactElement {
  const sync = useSyncState(useContext(SyncContext)?.sync);
  const isShown = status !== undefined || sync !== undefined;
  const statusClass = isSettled(status, sync) ? "header__status--saved" : "header__status--saving";
  return (
    <header className="header">
      <button type="button" className="header__title" onClick={onTitleClick}>
        {title}
      </button>
      <div className="header__meta">
        {children}
        {isShown && (
          <span className={`header__status ${statusClass}`} role="status">
            {statusLabelOf(status, sync)}
          </span>
        )}
      </div>
    </header>
  );
}
