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
