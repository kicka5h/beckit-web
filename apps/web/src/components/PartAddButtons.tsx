import type { ReactElement } from "react";

/** Props for `PartAddButtons`. */
export interface PartAddButtonsProps {
  /** What a new page is called here: "page", "chapter", "poem". */
  readonly addLabel: string;
  /** What a group is called here ("part", "section"), or undefined where groups aren't offered. */
  readonly groupLabel: string | undefined;
  readonly onAddPiece: () => void;
  readonly onAddGroup: () => void;
}

/** The buttons under a part of the outline that add a page, and in the body a group. */
export function PartAddButtons({
  addLabel,
  groupLabel,
  onAddPiece,
  onAddGroup,
}: PartAddButtonsProps): ReactElement {
  return (
    <div className="part__add">
      <button type="button" onClick={onAddPiece}>
        Add {addLabel}
      </button>
      {groupLabel !== undefined && (
        <button type="button" onClick={onAddGroup}>
          Add {groupLabel}
        </button>
      )}
    </div>
  );
}
