import { monotonicFactory } from "ulid";

/** Permanent identity of a block. Minted once, never reused, never derived from content. */
export type BlockId = string & { readonly __brand: "BlockId" };

const nextUlid = monotonicFactory();
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** Mints a new, time-sortable block id. */
export const newBlockId = (): BlockId => nextUlid() as BlockId;

/** True for strings shaped like an id this app minted. */
export const isBlockId = (value: unknown): value is BlockId =>
  typeof value === "string" && ULID_PATTERN.test(value);

/** A span of text in the edited document, end exclusive. */
export interface Range {
  readonly from: number;
  readonly to: number;
}

/** A block from before the edit: its id and where its text ended up after the edit. */
export interface PreviousBlock extends Range {
  readonly id: BlockId;
}

/** A block after the edit: where it sits and the id the editor left on it, if any. */
export interface CurrentBlock extends Range {
  readonly id: BlockId | null;
}

const overlap = (a: Range, b: Range): number =>
  Math.max(0, Math.min(a.to, b.to) - Math.max(a.from, b.from));

/**
 * Index of the current block holding most of `previous`'s text. Ties go to a block already
 * carrying the id, then to the earlier block.
 */
function heirOf(previous: PreviousBlock, current: readonly CurrentBlock[]): number {
  let best = -1;
  let bestOverlap = 0;
  current.forEach((block, index) => {
    const shared = overlap(previous, block);
    const tieGoesHere = block.id === previous.id && current[best]?.id !== previous.id;
    const wins = shared > bestOverlap || (shared === bestOverlap && tieGoesHere);
    if (shared > 0 && wins) {
      best = index;
      bestOverlap = shared;
    }
  });
  return best;
}

/**
 * Each current block that inherits an id, mapped to that id. In a merge the bigger contributor
 * wins; ties go to the id the block already carries, then to the earlier block.
 */
function claimHeirs(
  previous: readonly PreviousBlock[],
  current: readonly CurrentBlock[],
): Map<number, BlockId> {
  const claims = new Map<number, { id: BlockId; shared: number }>();
  for (const block of previous) {
    const heir = heirOf(block, current);
    const target = current[heir];
    if (!target) continue;
    const shared = overlap(block, target);
    const prior = claims.get(heir);
    const tieGoesHere = target.id === block.id && target.id !== prior?.id;
    if (!prior || shared > prior.shared || (shared === prior.shared && tieGoesHere)) {
      claims.set(heir, { id: block.id, shared });
    }
  }
  return new Map([...claims].map(([index, { id }]) => [index, id]));
}

/**
 * Decides the id of every block an edit touched. Identity follows the bulk of the text:
 * - the block holding most of an old block's text keeps that block's id (Enter, paste, retype);
 * - when blocks merge, the one that contributed the most text gives its id;
 * - ties go to the id a block already carries, then to the earlier block;
 * - a block holding no old text keeps the id it carries if it is unused (a cut paragraph pasted
 *   back, an empty paragraph being typed into), otherwise it gets a new id.
 *
 * `inUseElsewhere` reports ids held by blocks outside the edited range.
 */
export function resolveBlockIds(
  previous: readonly PreviousBlock[],
  current: readonly CurrentBlock[],
  inUseElsewhere: (id: BlockId) => boolean = () => false,
  mint: () => BlockId = newBlockId,
): BlockId[] {
  const claims = claimHeirs(previous, current);
  const used = new Set(claims.values());

  return current.map((block, index) => {
    const claimed = claims.get(index);
    if (claimed) return claimed;
    const { id } = block;
    if (id && !used.has(id) && !inUseElsewhere(id)) {
      used.add(id);
      return id;
    }
    return mint();
  });
}
