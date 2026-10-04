import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemorySettings } from "../project/test-project.ts";
import { createPassphraseAccounts } from "./passphrase-account.ts";

const SERVER = "https://beckit.example.com";

function answerWith(status: number): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response("{}", { status }))),
  );
}

describe("createPassphraseAccounts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps a passphrase the server accepts, and signs out again", async () => {
    answerWith(200);
    const settings = createMemorySettings();
    const accounts = createPassphraseAccounts(settings, SERVER);
    const listener = vi.fn();
    accounts.subscribe(listener);
    await accounts.signIn("correct horse");
    expect(await accounts.current()?.getToken()).toBe("correct horse");
    expect(listener).toHaveBeenCalled();
    expect(createPassphraseAccounts(settings, SERVER).current()).toBeDefined();
    await accounts.signOut();
    expect(accounts.current()).toBeUndefined();
  });

  it("refuses a passphrase the server rejects", async () => {
    answerWith(401);
    const accounts = createPassphraseAccounts(createMemorySettings(), SERVER);
    await expect(accounts.signIn("wrong")).rejects.toThrow(/didn't accept/);
    expect(accounts.current()).toBeUndefined();
  });
});
