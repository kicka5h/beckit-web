import { EditorContent, useEditor } from "@tiptap/react";
import type { ReactElement } from "react";
import type { ChapterSession } from "../chapter/chapter-session.ts";
import { extensions } from "../editor/extensions.ts";
import { snapshotsOf, toDocJSON } from "../editor/snapshot.ts";

interface ChapterEditorProps {
  readonly session: ChapterSession;
}

export function ChapterEditor({ session }: ChapterEditorProps): ReactElement {
  const editor = useEditor({
    extensions,
    content: toDocJSON(session.blocks),
    autofocus: "end",
    editorProps: { attributes: { class: "prose", spellcheck: "true" } },
    onUpdate: ({ editor: current }) => {
      const { doc } = current.state;
      session.update(() => snapshotsOf(doc));
    },
  });

  return (
    <main className="page">
      <EditorContent editor={editor} />
    </main>
  );
}
