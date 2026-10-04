import { monotonicFactory } from "ulid";

import { overlapOf, type Span } from "./span.ts";

/** Permanent identity of a block. Minted once, never reused, never derived from content. */
export type BlockId = string & { readonly __brand: "BlockId" };

/** A block from before an edit: its id and where its text ended up after the edit. */
export interface PreviousBlock extends Span {
  readonly id: BlockId;
}

/** A block after an edit: where its text sits and the id the editor left on it, if any. */
export interface CurrentBlock extends Span {
  readonly id: BlockId | undefined;
}

interface Heir {
  readonly index: number;
  readonly shared: number;
  readonly carriedId: BlockId | undefined;
}

interface Claim {
  readonly id: BlockId;
  readonly shared: number;
}

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** Mints a new ULID: unique, and sortable by the time it was minted. Internal to core. */
export const mintUlid = monotonicFactory();

/** Whether a value is a ULID. Internal to core; ids are checked through their own predicates. */
export function isUlid(value: unknown): value is string {
  return typeof value === "string" && ULID_PATTERN.test(value);
}

/** Mints a new, time-sortable block id. */
export function createBlockId(): BlockId {
  return mintUlid() as BlockId;
}

/** Whether a value is an id this app minted. */
export function isBlockId(value: unknown): value is BlockId {
  return isUlid(value);
}

/**
 * The current block holding most of `previous`'s text. Ties go to a block already carrying
 * the id, then to the earlier block.
 */
function heirOf(previous: PreviousBlock, current: readonly CurrentBlock[]): Heir | undefined {
  let heir: Heir | undefined;
  for (const [index, block] of current.entries()) {
    const shared = overlapOf(previous, block);
    const best = heir?.shared ?? 0;
    const isTieWon = block.id === previous.id && heir?.carriedId !== previous.id;
    if (shared > best || (shared > 0 && shared === best && isTieWon)) {
      heir = { index, shared, carriedId: block.id };
    }
  }
  return heir;
}

/**
 * Assigns each current block the id it inherits. In a merge the bigger contributor wins; ties go to
 * the id the block already carries, then to the earlier block.
 */
function claimHeirs(
  previous: readonly PreviousBlock[],
  current: readonly CurrentBlock[],
): Map<number, BlockId> {
  const claims = new Map<number, Claim>();
  for (const block of previous) {
    const heir = heirOf(block, current);
    if (!heir) continue;
    const { index, shared, carriedId } = heir;
    const prior = claims.get(index);
    const isTieWon = carriedId === block.id && carriedId !== prior?.id;
    if (!prior || shared > prior.shared || (shared === prior.shared && isTieWon)) {
      claims.set(index, { id: block.id, shared });
    }
  }
  return new Map([...claims].map(([index, claim]) => [index, claim.id]));
}

/**
 * Decides the id of every block an edit touched. Identity follows the bulk of the text:
 * - the block holding most of an old block's text keeps that block's id (Enter, paste, retype);
 * - when blocks merge, the one that contributed the most text gives its id;
 * - ties go to the id a block already carries, then to the earlier block;
 * - a block holding no old text keeps the id it carries if that id is free (a cut paragraph
 *   pasted back, an empty paragraph being typed into); otherwise it gets a new id.
 *
 * `isHeldElsewhere` reports ids held by blocks outside the edited range.
 */
export function resolveBlockIds(
  previous: readonly PreviousBlock[],
  current: readonly CurrentBlock[],
  isHeldElsewhere: (id: BlockId) => boolean = () => false,
  mint: () => BlockId = createBlockId,
): BlockId[] {
  const claims = claimHeirs(previous, current);
  const used = new Set(claims.values());
  return current.map((block, index) => {
    const claimed = claims.get(index);
    if (claimed) return claimed;
    if (block.id && !used.has(block.id) && !isHeldElsewhere(block.id)) {
      used.add(block.id);
      return block.id;
    }
    return mint();
  });
}
