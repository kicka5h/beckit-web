/**
 * Edits `list` in place until it equals `next`, touching only the positions that differ.
 * Written for Automerge list proxies, where every splice becomes a recorded change,
 * so an unchanged chapter order produces no change at all.
 */
export function syncList<T>(list: T[], next: readonly T[]): void {
  const wanted = new Set(next);
  for (let i = list.length - 1; i >= 0; i--) {
    const item = list[i];
    if (item !== undefined && !wanted.has(item)) list.splice(i, 1);
  }

  next.forEach((item, i) => {
    if (list[i] === item) return;
    const from = list.indexOf(item, i);
    if (from !== -1) list.splice(from, 1);
    list.splice(i, 0, item);
  });
}
