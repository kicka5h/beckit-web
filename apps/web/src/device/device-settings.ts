/** Small values remembered on this device only: which project is open, where the cursor was. */
export interface DeviceSettings {
  readonly read: (key: string) => string | undefined;
  readonly write: (key: string, value: string) => void;
}

const KEY_PREFIX = "beckit.";

/**
 * Settings kept in `localStorage`. Storage can be missing or blocked (private windows, previews),
 * so a failed read finds nothing and a failed write is dropped: these are conveniences, and the
 * writing itself lives in IndexedDB.
 */
export const browserSettings: DeviceSettings = {
  read: (key) => {
    try {
      return localStorage.getItem(KEY_PREFIX + key) ?? undefined;
    } catch {
      return undefined;
    }
  },
  write: (key, value) => {
    try {
      localStorage.setItem(KEY_PREFIX + key, value);
    } catch {
      // Dropped on purpose: see above.
    }
  },
};
