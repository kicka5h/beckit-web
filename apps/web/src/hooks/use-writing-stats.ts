import type { Repo } from "@automerge/automerge-repo";
import { useMemo } from "react";

import {
  type BlockSnapshot,
  countProjectWords,
  countWordForms,
  type ManuscriptDoc,
  measureBlocks,
  measureText,
  type NodeId,
  readingLevelOf,
  wordsOf,
} from "@beckit/core";

import type { WritingStatsProps } from "../components/WritingStats.tsx";
import { useScopeTexts } from "./use-scope-texts.ts";

/** What the stats need: the open piece, its live blocks and the highlighted text. */
export interface WritingStatsInput {
  readonly repo: Repo;
  readonly doc: ManuscriptDoc;
  readonly pieceId: NodeId;
  readonly blocks: readonly BlockSnapshot[];
  readonly selectedText: string;
}

/** The highlighted word, if exactly one whole word is highlighted. */
function singleWordOf(text: string): string | undefined {
  const trimmed = text.trim();
  const [word, ...rest] = wordsOf(trimmed);
  return word === trimmed && rest.length === 0 ? word : undefined;
}

/**
 * The live counts for the open piece: words in the selection, piece and project, the reading
 * level of the selection (or the piece), and every form of a single highlighted word.
 */
export function useWritingStats({
  repo,
  doc,
  pieceId,
  blocks,
  selectedText,
}: WritingStatsInput): WritingStatsProps {
  const pieceStats = useMemo(() => measureBlocks(blocks), [blocks]);
  const selectionStats = useMemo(
    () => (selectedText ? measureText(selectedText) : undefined),
    [selectedText],
  );
  const scopeTexts = useScopeTexts(repo, doc, pieceId, blocks);
  const word = singleWordOf(selectedText);
  const forms = useMemo(() => (word ? countWordForms(scopeTexts, word) : []), [scopeTexts, word]);
  return {
    selectionWords: selectionStats?.words,
    pieceWords: pieceStats.words,
    projectWords: countProjectWords(doc),
    level: readingLevelOf(selectionStats ?? pieceStats),
    forms,
  };
}
