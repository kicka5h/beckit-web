import type { ReactElement } from "react";

import type { ReadingLevel, WordFormCount } from "@beckit/core";

/** Props for `WritingStats`. */
export interface WritingStatsProps {
  /** Words in the highlighted text, or undefined when nothing is highlighted. */
  readonly selectionWords: number | undefined;
  readonly pieceWords: number;
  /** Words in the body of the project; front and back matter are left out. */
  readonly projectWords: number;
  /** The level of the highlighted text, or of the piece; undefined below two sentences. */
  readonly level: ReadingLevel | undefined;
  /** Each form of a single highlighted word, with its count in the piece's section. */
  readonly forms: readonly WordFormCount[];
}

/**
 * The counts beside the save status: words in the highlighted text or the piece, words in the
 * project, the reading level, and how often each form of a highlighted word appears. All computed
 * on this device, so they work in airplane mode.
 */
export function WritingStats({
  selectionWords,
  pieceWords,
  projectWords,
  level,
  forms,
}: WritingStatsProps): ReactElement {
  const pieceCount = pieceWords.toLocaleString();
  return (
    <>
      <span>
        {selectionWords === undefined
          ? `${pieceCount} words`
          : `${selectionWords.toLocaleString()} of ${pieceCount} words`}
      </span>
      <span>{projectWords.toLocaleString()} in project</span>
      <span title="Dale–Chall reading level">{level?.label ?? "Level N/A"}</span>
      {forms.length > 0 && (
        <span className="header__forms" aria-label="Forms of the highlighted word">
          {forms.map(({ form, count }) => `${form} ${count.toLocaleString()}`).join(" · ")}
        </span>
      )}
    </>
  );
}
