import { type ReactElement, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { countBlockWords, writePieceWords } from "@beckit/core";

import { ChapterSession } from "../chapter/chapter-session.ts";
import type { DeviceSettings } from "../device/device-settings.ts";
import { useDoc } from "../hooks/use-doc.ts";
import type { OpenProject } from "../project/open-project.ts";
import { ChapterEditor } from "./ChapterEditor.tsx";
import { Header } from "./Header.tsx";
import { HomeScreenHint } from "./HomeScreenHint.tsx";

/** Props for `Workspace`. */
export interface WorkspaceProps {
  readonly project: OpenProject;
  readonly settings: DeviceSettings;
}

/** The open piece under its header, saving to this device as the writer types. */
export function Workspace({ project, settings }: WorkspaceProps): ReactElement {
  const { repo, manuscript: manuscriptHandle, pieceId, chapter } = project;
  const [session] = useState(
    () => new ChapterSession(chapter, { flush: () => repo.flush([chapter.documentId]) }),
  );
  const blocks = useSyncExternalStore(session.subscribe, () => session.blocks);
  const status = useSyncExternalStore(session.subscribe, () => session.status);
  const manuscript = useDoc(manuscriptHandle);
  const wordCount = useMemo(() => countBlockWords(blocks), [blocks]);
  const cursorKey = `cursor.${pieceId}`;
  const savedCursor = settings.read(cursorKey);

  useEffect(() => {
    manuscriptHandle.change((doc) => {
      writePieceWords(doc, pieceId, wordCount);
    });
  }, [manuscriptHandle, pieceId, wordCount]);

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
    };
  }, [session]);

  const piece = manuscript.nodes[pieceId];
  return (
    <>
      <Header title={piece?.title ?? ""} wordCount={wordCount} status={status} />
      <HomeScreenHint settings={settings} />
      <ChapterEditor
        session={session}
        initialCursor={savedCursor === undefined ? undefined : Number(savedCursor)}
        onCursorChange={(position) => {
          settings.write(cursorKey, String(position));
        }}
      />
    </>
  );
}
