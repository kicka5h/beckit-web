import type { DocHandle, Repo } from "@automerge/automerge-repo";
import { type ReactElement, useEffect, useState, useSyncExternalStore } from "react";

import { type ChapterDoc, type ManuscriptDoc, type NodeId, writePieceWords } from "@beckit/core";

import { ChapterSession } from "../chapter/chapter-session.ts";
import type { DeviceSettings } from "../device/device-settings.ts";
import { useWritingStats } from "../hooks/use-writing-stats.ts";
import { ChapterEditor } from "./ChapterEditor.tsx";
import { FactsMarquee } from "./FactsMarquee.tsx";
import { Header } from "./Header.tsx";
import { WritingStats } from "./WritingStats.tsx";

/** Props for `PieceView`. */
export interface PieceViewProps {
  readonly repo: Repo;
  readonly manuscript: DocHandle<ManuscriptDoc>;
  /** The manuscript's current contents, for the project count and repeated words. */
  readonly doc: ManuscriptDoc;
  readonly pieceId: NodeId;
  readonly title: string;
  readonly chapter: DocHandle<ChapterDoc>;
  readonly flush: () => Promise<void>;
  readonly settings: DeviceSettings;
  readonly onTitleClick: () => void;
}

/** One piece open for writing under its header, saved to this device as the writer types. */
export function PieceView({
  repo,
  manuscript,
  doc,
  pieceId,
  title,
  chapter,
  flush,
  settings,
  onTitleClick,
}: PieceViewProps): ReactElement {
  const [session] = useState(() => new ChapterSession(chapter, { flush }));
  const blocks = useSyncExternalStore(session.subscribe, () => session.blocks);
  const status = useSyncExternalStore(session.subscribe, () => session.status);
  const [selectedText, setSelectedText] = useState("");
  const stats = useWritingStats({ repo, doc, pieceId, blocks, selectedText });
  const wordCount = stats.pieceWords;
  const cursorKey = `cursor.${pieceId}`;
  const savedCursor = settings.read(cursorKey);

  useEffect(() => {
    manuscript.change((draft) => {
      writePieceWords(draft, pieceId, wordCount);
    });
  }, [manuscript, pieceId, wordCount]);

  useEffect(() => {
    // Phones rarely fire pagehide when an app is swiped away; going hidden is the reliable signal.
    function saveWhenHidden(): void {
      if (document.visibilityState === "hidden") session.save();
    }
    function save(): void {
      session.save();
    }
    document.addEventListener("visibilitychange", saveWhenHidden);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener("pagehide", save);
      // Leaving this piece for another one: write what was typed before letting go.
      session.save();
      session.close();
    };
  }, [session]);

  return (
    <>
      <Header title={title} status={status} onTitleClick={onTitleClick}>
        <WritingStats {...stats} />
      </Header>
      <ChapterEditor
        session={session}
        initialCursor={savedCursor === undefined ? undefined : Number(savedCursor)}
        onCursorChange={(position) => {
          settings.write(cursorKey, String(position));
        }}
        onSelectionChange={setSelectedText}
      />
      <FactsMarquee />
    </>
  );
}
