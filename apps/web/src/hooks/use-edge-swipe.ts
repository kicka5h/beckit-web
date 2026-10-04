import { useEffect } from "react";

/** How close to the left edge a swipe must start, and how far it must travel, in CSS pixels. */
const EDGE_WIDTH = 24;
const SWIPE_DISTANCE = 60;

/**
 * Calls `onOpen` when a finger swipes right from the left edge of the screen, and `onClose` when
 * one swipes left anywhere: the phone's way to open and close a side panel.
 */
export function useEdgeSwipe(onOpen: () => void, onClose: () => void): void {
  useEffect(() => {
    let start: Touch | undefined;
    function handleStart(event: TouchEvent): void {
      start = event.touches[0];
    }
    function handleEnd(event: TouchEvent): void {
      const end = event.changedTouches[0];
      if (!start || !end) return;
      const distance = end.clientX - start.clientX;
      if (start.clientX <= EDGE_WIDTH && distance >= SWIPE_DISTANCE) onOpen();
      else if (distance <= -SWIPE_DISTANCE) onClose();
      start = undefined;
    }
    window.addEventListener("touchstart", handleStart, { passive: true });
    window.addEventListener("touchend", handleEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleStart);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [onOpen, onClose]);
}
