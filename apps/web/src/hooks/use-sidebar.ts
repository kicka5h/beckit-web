import { useCallback, useState } from "react";

import type { DeviceSettings } from "../device/device-settings.ts";
import { useEdgeSwipe } from "./use-edge-swipe.ts";
import { useShortcut } from "./use-shortcut.ts";

/** Whether the outline is open, with ways to set and toggle it. */
export interface SidebarState {
  readonly isOpen: boolean;
  readonly show: (isOpen: boolean) => void;
  readonly toggle: () => void;
}

const SIDEBAR_KEY = "sidebar";
const SIDEBAR_SHORTCUT = "\\";

/**
 * The outline's open state, remembered on this device. It toggles by shortcut on a laptop
 * (Command or Control with backslash) and by a swipe from the left edge on a phone.
 */
export function useSidebar(settings: DeviceSettings): SidebarState {
  const [isOpen, setIsOpen] = useState(() => settings.read(SIDEBAR_KEY) === "open");

  const show = useCallback(
    (isShown: boolean) => {
      settings.write(SIDEBAR_KEY, isShown ? "open" : "closed");
      setIsOpen(isShown);
    },
    [settings],
  );
  const toggle = useCallback(() => {
    show(!isOpen);
  }, [show, isOpen]);
  const open = useCallback(() => {
    show(true);
  }, [show]);
  const close = useCallback(() => {
    show(false);
  }, [show]);

  useShortcut(SIDEBAR_SHORTCUT, toggle);
  useEdgeSwipe(open, close);
  return { isOpen, show, toggle };
}
