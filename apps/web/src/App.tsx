import { countBlockWords } from "@beckit/core";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactElement } from "react";
import { ChapterSession } from "./chapter/chapter-session.ts";
import { ChapterEditor } from "./components/ChapterEditor.tsx";
import { Header } from "./components/Header.tsx";
import { seedChapter } from "./seed.ts";

export function App(): ReactElement {
  const [session] = useState(() => new ChapterSession(seedChapter()));
  const blocks = useSyncExternalStore(session.subscribe, () => session.blocks);
  const words = useMemo(() => countBlockWords(blocks), [blocks]);

  useEffect(() => {
    const save = (): void => {
      session.save();
    };
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
    };
  }, [session]);

  return (
    <>
      <Header title={session.title} words={words} />
      <ChapterEditor session={session} />
    </>
  );
}
