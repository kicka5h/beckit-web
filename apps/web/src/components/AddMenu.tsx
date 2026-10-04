import { type ReactElement, useState } from "react";

/** One thing a "+" button can add. */
export interface AddChoice {
  /** What the choice does, as a button or menu item reads it: "Add chapter". */
  readonly label: string;
  readonly onAdd: () => void;
}

/** Props for `AddMenu`. */
export interface AddMenuProps {
  readonly choices: readonly AddChoice[];
  /** Names the button when it opens a menu of several choices: "Add to Body". */
  readonly menuLabel: string;
}

/**
 * A "+" button, as iOS puts beside a list's heading. With one choice it adds straight away; with
 * several it opens a menu, so look-alike actions never sit side by side.
 */
export function AddMenu({ choices, menuLabel }: AddMenuProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [onlyChoice] = choices;

  if (choices.length === 1 && onlyChoice) {
    return (
      <button
        type="button"
        className="control icon icon--add"
        aria-label={onlyChoice.label}
        onClick={onlyChoice.onAdd}
      />
    );
  }
  return (
    <div className="add-menu">
      <button
        type="button"
        className="control icon icon--add"
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      />
      {isOpen && (
        <div className="add-menu__items" role="menu">
          {choices.map(({ label, onAdd }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onAdd();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
