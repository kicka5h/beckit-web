import type { Repo } from "@automerge/automerge-repo";
import { useEffect, useMemo, useState } from "react";

import {
  type BlockSnapshot,
  type ChapterDoc,
  isNodeId,
  type ManuscriptDoc,
  type NodeId,
  readChapter,
  repeatScopeOf,
} from "@beckit/core";

import { findStored } from "../project/documents.ts";

/** Reads the text of every piece in `ids` from this device, one string per block. */
async function readPieces(
  repo: Repo,
  doc: ManuscriptDoc,
  ids: readonly NodeId[],
): Promise<string[]> {
  const texts = await Promise.all(
    ids.map(async (id) => {
      const node = doc.nodes[id];
      if (node?.kind !== "piece") return [];
      const chapter = await findStored<ChapterDoc>(repo, node.chapterUrl);
      return chapter ? readChapter(chapter.doc()).map(({ text }) => text) : [];
    }),
  );
  return texts.flat();
}

/**
 * The text a repeated-word count covers for the open piece: its own live blocks plus the other
 * pieces of its section (or the whole body of a flat project), loaded once from this device.
 */
export function useScopeTexts(
  repo: Repo,
  doc: ManuscriptDoc,
  pieceId: NodeId,
  blocks: readonly BlockSnapshot[],
): readonly string[] {
  const [otherTexts, setOtherTexts] = useState<readonly string[]>([]);
  // Joined so the effect reruns only when the scope itself changes, not on every edit.
  const others = repeatScopeOf(doc, pieceId)
    .filter((id) => id !== pieceId)
    .join(" ");

  useEffect(() => {
    let isCurrent = true;
    const ids = others ? others.split(" ").filter(isNodeId) : [];
    void readPieces(repo, doc, ids).then((texts) => {
      if (isCurrent) setOtherTexts(texts);
    });
    return () => {
      isCurrent = false;
    };
    // `doc` is read once per scope: other pieces don't change while this one is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [repo, others]);

  return useMemo(() => [...blocks.map(({ text }) => text), ...otherTexts], [blocks, otherTexts]);
}
