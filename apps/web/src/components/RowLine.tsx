import type { ReactElement } from "react";

/** Props for `RowLine`. */
export interface RowLineProps {
  readonly title: string;
  readonly isRenaming: boolean;
  readonly canOpen: boolean;
  readonly isMenuOpen: boolean;
  readonly onOpen: () => void;
  readonly onRenamed: (title: string) => void;
  readonly onToggleMenu: () => void;
}

/**
 * A row's visible line: its title, which opens the page (or a text field while it is being
 * renamed), and the button that opens its menu of actions.
 */
export function RowLine({
  title,
  isRenaming,
  canOpen,
  isMenuOpen,
  onOpen,
  onRenamed,
  onToggleMenu,
}: RowLineProps): ReactElement {
  return (
    <>
      {isRenaming ? (
        <input
          className="field"
          defaultValue={title}
          aria-label="Title"
          autoFocus
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          onBlur={(event) => {
            onRenamed(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
          }}
        />
      ) : (
        <button type="button" className="row__title" disabled={!canOpen} onClick={onOpen}>
          {title}
        </button>
      )}
      <button
        type="button"
        className="control"
        aria-label={`Actions for ${title}`}
        aria-expanded={isMenuOpen}
        onClick={onToggleMenu}
      >
        ⋯
      </button>
    </>
  );
}
