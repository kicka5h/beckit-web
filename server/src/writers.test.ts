import { describe, expect, it } from "vitest";

import { createPassphraseVerifier, toAllowedEmails } from "./writers.ts";

describe("toAllowedEmails", () => {
  it("reads a comma-separated list, ignoring case, spaces and blanks", () => {
    expect([...toAllowedEmails(" Ash@Example.com, ,b@example.com ")]).toEqual([
      "ash@example.com",
      "b@example.com",
    ]);
  });
});

describe("createPassphraseVerifier", () => {
  it("lets in the passphrase and nothing else", async () => {
    const verify = createPassphraseVerifier("correct horse battery staple");
    expect(await verify("correct horse battery staple")).toMatchObject({ uid: "self" });
    expect(await verify("correct horse")).toBeUndefined();
    expect(await verify("")).toBeUndefined();
  });
});
