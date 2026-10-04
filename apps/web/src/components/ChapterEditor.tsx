import { EditorContent, useEditor } from "@tiptap/react";
import { type ReactElement, useEffect, useSyncExternalStore } from "react";

import type { ChapterSession } from "../chapter/chapter-session.ts";
import { extensions } from "../editor/extensions.ts";
import { toDocJson, toSnapshots } from "../editor/snapshot.ts";

/** Props for `ChapterEditor`. */
export interface ChapterEditorProps {
  readonly session: ChapterSession;
  /** Where to put the cursor on opening, as a document position; the end if unknown. */
  readonly initialCursor: number | undefined;
  readonly onCursorChange?: (position: number) => void;
  /** Called with the highlighted text whenever the selection changes; "" when nothing is. */
  readonly onSelectionChange?: (text: string) => void;
}

/** The writing surface for one chapter, reporting every change to its session. */
export function ChapterEditor({
  session,
  initialCursor,
  onCursorChange,
  onSelectionChange,
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
      const { doc, selection } = current.state;
      onCursorChange?.(selection.head);
      onSelectionChange?.(doc.textBetween(selection.from, selection.to, "\n"));
    },
  });

  const revision = useSyncExternalStore(session.subscribe, () => session.revision);
  useEffect(() => {
    // Changes from another device merged in: show the merged text, keeping the cursor in place.
    if (revision === 0) return;
    const { from, to } = editor.state.selection;
    editor.commands.setContent(toDocJson(session.blocks), { emitUpdate: false });
    const size = editor.state.doc.content.size;
    editor.commands.setTextSelection({ from: Math.min(from, size), to: Math.min(to, size) });
  }, [editor, session, revision]);

  return (
    <main className="page">
      <EditorContent editor={editor} />
    </main>
  );
}
