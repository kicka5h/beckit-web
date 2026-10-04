import { BLOCK_TYPES, type BlockType } from "@beckit/core";

/** The editor attribute holding a block's permanent id. */
export const ID_ATTRIBUTE = "id";

/** The one place core block types meet editor node names. */
export const NODE_FOR_BLOCK = {
  paragraph: "paragraph",
  heading: "heading",
  sceneBreak: "horizontalRule",
} as const satisfies Record<BlockType, string>;

/** Every top-level node type that carries a permanent block id. */
export const idNodeTypes: readonly string[] = Object.values(NODE_FOR_BLOCK);

const blockTypeByNodeName = new Map<string, BlockType>(
  BLOCK_TYPES.map((blockType) => [NODE_FOR_BLOCK[blockType], blockType]),
);

/** The core block type for an editor node name, if Beckit stores that node. */
export function blockTypeOf(nodeName: string): BlockType | undefined {
  return blockTypeByNodeName.get(nodeName);
}
