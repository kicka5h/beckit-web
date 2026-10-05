import { type ReactElement, type ReactNode, useContext, useState } from "react";

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
  /** Counts shown in the details card, above the sync status. */
  readonly children?: ReactNode;
}

/**
 * The bar above the page: the piece title (which opens the outline), an info button and a status
 * checkmark. The counts and the status in words wait behind the info button, so the bar stays
 * quiet while the writer writes.
 */
export function Header({ title, status, onTitleClick, children }: HeaderProps): ReactElement {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const sync = useSyncState(useContext(SyncContext)?.sync);
  const isShown = status !== undefined || sync !== undefined;
  const label = statusLabelOf(status, sync);
  const statusClass = isSettled(status, sync) ? "header__status--saved" : "header__status--saving";
  return (
    <header className="header">
      <button type="button" className="header__title icon icon--sidebar" onClick={onTitleClick}>
        {title}
      </button>
      <div className="header__meta">
        <button
          type="button"
          className="control icon icon--info"
          aria-label="Writing details"
          aria-expanded={isDetailsOpen}
          onClick={() => {
            setIsDetailsOpen(!isDetailsOpen);
          }}
        />
        {isShown && (
          <span className={`header__status ${statusClass}`} role="status" title={label}>
            <span className="header__status-label">{label}</span>
          </span>
        )}
      </div>
      {isDetailsOpen && (
        <div className="header__details">
          {children}
          {isShown && <span>{label}</span>}
        </div>
      )}
    </header>
  );
}
