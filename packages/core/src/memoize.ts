/**
 * Wraps `compute` so it runs once per argument object. Entries disappear when the object is
 * garbage collected, so caching never keeps old editor states alive.
 */
export function memoize<Key extends object, Value>(
  compute: (key: Key) => Value,
): (key: Key) => Value {
  const cache = new WeakMap<Key, { readonly value: Value }>();
  return (key) => {
    const cached = cache.get(key);
    if (cached) return cached.value;
    const value = compute(key);
    cache.set(key, { value });
    return value;
  };
}
