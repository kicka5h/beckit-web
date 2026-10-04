import { EditorContent, useEditor } from "@tiptap/react";
import type { ReactElement } from "react";

import type { ChapterSession } from "../chapter/chapter-session.ts";
import { extensions } from "../editor/extensions.ts";
import { toDocJson, toSnapshots } from "../editor/snapshot.ts";

/** Props for `ChapterEditor`. */
export interface ChapterEditorProps {
  readonly session: ChapterSession;
}

/** The writing surface for one chapter, reporting every change to its session. */
export function ChapterEditor({ session }: ChapterEditorProps): ReactElement {
  const editor = useEditor({
    extensions: [...extensions],
    content: toDocJson(session.blocks),
    autofocus: "end",
    editorProps: { attributes: { class: "prose", spellcheck: "true" } },
    onUpdate: ({ editor: current }) => {
      const { doc } = current.state;
      session.update(() => toSnapshots(doc));
    },
  });

  return (
    <main className="page">
      <EditorContent editor={editor} />
    </main>
  );
}
