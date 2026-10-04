import { EditorContent, useEditor } from "@tiptap/react";
import type { ReactElement } from "react";

import type { ChapterSession } from "../chapter/chapter-session.ts";
import { extensions } from "../editor/extensions.ts";
import { toDocJson, toSnapshots } from "../editor/snapshot.ts";

/** Props for `ChapterEditor`. */
export interface ChapterEditorProps {
  readonly session: ChapterSession;
  /** Where to put the cursor on opening, as a document position; the end if unknown. */
  readonly initialCursor: number | undefined;
  readonly onCursorChange?: (position: number) => void;
}

/** The writing surface for one chapter, reporting every change to its session. */
export function ChapterEditor({
  session,
  initialCursor,
  onCursorChange,
}: ChapterEditorProps): ReactElement {
  const editor = useEditor({
    extensions: [...extensions],
    content: toDocJson(session.blocks),
    autofocus: initialCursor ?? "end",
    editorProps: { attributes: { class: "prose", spellcheck: "true" } },
    onUpdate: ({ editor: current }) => {
      const { doc } = current.state;
      session.update(() => toSnapshots(doc));
    },
    onSelectionUpdate: ({ editor: current }) => {
      onCursorChange?.(current.state.selection.head);
    },
  });

  return (
    <main className="page">
      <EditorContent editor={editor} />
    </main>
  );
}
