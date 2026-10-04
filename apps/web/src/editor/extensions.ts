import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import { HEADING_LEVELS } from "@beckit/core";

import { BlockIds } from "./block-ids.ts";

/**
 * Everything the editor understands: exactly the blocks and marks core stores
 * (`schema.test.ts` fails if the two drift apart).
 */
export const extensions: readonly AnyExtension[] = [
  StarterKit.configure({
    heading: { levels: [...HEADING_LEVELS] },
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    code: false,
    codeBlock: false,
    hardBreak: false,
    link: false,
    strike: false,
    underline: false,
  }),
  BlockIds,
];
