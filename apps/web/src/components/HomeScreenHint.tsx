import { type ReactElement, useState } from "react";

import type { DeviceSettings } from "../device/device-settings.ts";
import { isInstalled, isIos } from "../device/platform.ts";

/** Props for `HomeScreenHint`. */
export interface HomeScreenHintProps {
  readonly settings: DeviceSettings;
}

const DISMISSED_KEY = "homeScreenHintDismissed";

/**
 * The note asking iPhone and iPad writers to add Beckit to the Home Screen: Safari may clear
 * storage for sites not visited in seven days, but never for Home Screen apps.
 */
export function HomeScreenHint({ settings }: HomeScreenHintProps): ReactElement | undefined {
  const [isShown, setIsShown] = useState(
    () => isIos() && !isInstalled() && settings.read(DISMISSED_KEY) === undefined,
  );
  if (!isShown) return undefined;

  function dismiss(): void {
    settings.write(DISMISSED_KEY, "true");
    setIsShown(false);
  }

  return (
    <aside className="hint">
      <span>
        Keep your writing safe on this device: tap Share, then Add to Home Screen, and open Beckit
        from there.
      </span>
      <button type="button" className="hint__dismiss" onClick={dismiss}>
        Got it
      </button>
    </aside>
  );
}
