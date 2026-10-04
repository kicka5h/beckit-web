import { useEffect } from "react";

/** Calls `run` when the writer presses Command (Mac) or Control (elsewhere) with `key`. */
export function useShortcut(key: string, run: () => void): void {
  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key === key) {
        event.preventDefault();
        run();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [key, run]);
}
