import type { Part, TreeStep } from "@beckit/core";

/** What each part is called in the outline. */
export const PART_LABELS = {
  front: "Front matter",
  body: "Body",
  back: "Back matter",
} as const satisfies Record<Part, string>;

/** The menu label of each one-step move. */
export const STEP_LABELS = {
  up: "Move up",
  down: "Move down",
  in: "Into the section above",
  out: "Out of its section",
} as const satisfies Record<TreeStep, string>;

/** The deepest nesting the outline and contents page indent for; deeper rows line up with it. */
const MAX_INDENT_DEPTH = 3;

/** The BEM modifier class for a row nested `depth` levels deep: `row--depth-2`. */
export function depthClassOf(block: string, depth: number): string {
  return `${block}--depth-${String(Math.min(depth, MAX_INDENT_DEPTH))}`;
}
