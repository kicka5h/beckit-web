/**
 * Edits `list` in place until it equals `next`, touching only the positions that differ.
 * Written for Automerge list proxies, where every splice becomes a recorded change, so an
 * unchanged chapter order produces no change at all.
 */
export function syncList<Item>(list: Item[], next: readonly Item[]): void {
  const wanted = new Set(next);
  const removals = [...list].flatMap((item, index) => (wanted.has(item) ? [] : [index]));
  for (const index of removals.toReversed()) list.splice(index, 1);

  for (const [index, item] of next.entries()) {
    if (list[index] === item) continue;
    const from = list.indexOf(item, index);
    if (from !== -1) list.splice(from, 1);
    list.splice(index, 0, item);
  }
}

function predecessorsOf<Item>(list: readonly Item[]): Map<Item, Item | undefined> {
  return new Map(list.map((item, index) => [item, list[index - 1]]));
}

/** One item of a growing increasing run, linked to the item before it in that run. */
interface RunLink<Item> {
  readonly item: Item;
  readonly position: number;
  readonly previous: RunLink<Item> | undefined;
}

/**
 * The items `a` and `b` keep in the same relative order: their longest common subsequence. For
 * lists of distinct items that is the longest run of `a`'s items whose places in `b` increase.
 */
function commonSubsequenceOf<Item>(a: readonly Item[], b: readonly Item[]): Set<Item> {
  const placesInB = new Map(b.map((item, index) => [item, index]));
  // tails[k] ends the best increasing run of length k + 1 found so far (patience sorting).
  const tails: RunLink<Item>[] = [];
  for (const item of a) {
    const position = placesInB.get(item);
    if (position === undefined) continue;
    const longer = tails.findIndex((tail) => tail.position > position);
    const index = longer === -1 ? tails.length : longer;
    tails[index] = { item, position, previous: tails[index - 1] };
  }
  const common = new Set<Item>();
  for (let link = tails.at(-1); link; link = link.previous) common.add(link.item);
  return common;
}

/**
 * Replays the reordering one side made, from `base` to `local`, onto `current`, a version that
 * also took in changes from elsewhere. Items `local` removed go. Items it kept in the same
 * relative order stay where `current` has them, so an item added elsewhere survives in place.
 * Items it added or moved go after the item they follow in `local`. With `current` equal to
 * `base`, the result is `local`.
 */
export function rebaseList<Item>(
  base: readonly Item[],
  local: readonly Item[],
  current: readonly Item[],
): Item[] {
  const inBase = new Set(base);
  const stationary = commonSubsequenceOf(base, local);
  const localPredecessors = predecessorsOf(local);
  const result = current.filter((item) => stationary.has(item) || !inBase.has(item));
  for (const item of local) {
    if (stationary.has(item)) continue;
    const predecessor = localPredecessors.get(item);
    const index = predecessor === undefined ? 0 : result.indexOf(predecessor) + 1;
    result.splice(index, 0, item);
  }
  return result;
}
