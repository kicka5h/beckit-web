import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AppUpdate, createAppUpdate, type RegisterOptions } from "./app-update.ts";

describe("createAppUpdate", () => {
  let options: RegisterOptions | undefined;
  let calls: string[] = [];

  function createTestUpdate(): AppUpdate {
    return createAppUpdate({
      register: (given) => {
        options = given;
        return () => {
          calls.push("activate");
          return Promise.resolve();
        };
      },
      flush: () => {
        calls.push("flush");
        return Promise.resolve();
      },
      reloadWhenReplaced: () => {
        calls.push("reload when replaced");
      },
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    calls = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the writer, then tells listeners once a newer version has downloaded", () => {
    const update = createTestUpdate();
    const listener = vi.fn();
    update.subscribe(listener);
    expect(update.isWaiting()).toBe(false);
    options?.onNeedRefresh();
    expect(update.isWaiting()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
    expect(calls).toEqual([]);
  });

  it("stores everything, then reloads into the newer version once it takes over", async () => {
    await createTestUpdate().install();
    expect(calls).toEqual(["flush", "reload when replaced", "activate"]);
  });

  it("leaves reloading to install rather than the plugin", () => {
    createTestUpdate();
    options?.onNeedReload();
    expect(calls).toEqual([]);
  });

  it("looks for a newer version every hour while the app stays open", () => {
    createTestUpdate();
    const registration = { update: vi.fn(() => Promise.reject(new Error("offline"))) };
    options?.onRegisteredSW("/sw.js", registration);
    options?.onRegisteredSW("/sw.js", undefined);
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledTimes(2);
  });
});
