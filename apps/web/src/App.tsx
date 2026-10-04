import { type ReactElement, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { countBlockWords } from "@beckit/core";

import { ChapterSession } from "./chapter/chapter-session.ts";
import { ChapterEditor } from "./components/ChapterEditor.tsx";
import { Header } from "./components/Header.tsx";
import { createSeedChapter } from "./seed.ts";

/** The whole app: one open chapter under its header. */
export function App(): ReactElement {
  const [session] = useState(() => new ChapterSession(createSeedChapter()));
  const blocks = useSyncExternalStore(session.subscribe, () => session.blocks);
  const wordCount = useMemo(() => countBlockWords(blocks), [blocks]);

  useEffect(() => {
    function save(): void {
      session.save();
    }
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
    };
  }, [session]);

  return (
    <>
      <Header title={session.title} wordCount={wordCount} />
      <ChapterEditor session={session} />
    </>
  );
}
