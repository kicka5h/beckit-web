import { useEffect, useEffectEvent, useState } from "react";

/**
 * What `load` resolves to for `keys`, loaded again whenever the keys change (not on every render,
 * since the array is rebuilt each time) and `initial` until the first load finishes. A load
 * that finishes after the keys have moved on is dropped.
 */
export function useLoaded<Value>(
  keys: readonly string[],
  load: (keys: readonly string[]) => Promise<Value>,
  initial: Value,
): Value {
  const [value, setValue] = useState(initial);
  // Keys never contain spaces (urls and ids), so joining them gives a dependency stable across
  // renders.
  const keyList = keys.join(" ");
  const loadLatest = useEffectEvent(load);

  useEffect(() => {
    let isCurrent = true;
    void loadLatest(keyList ? keyList.split(" ") : []).then((loaded) => {
      if (isCurrent) setValue(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [keyList]);

  return value;
}
