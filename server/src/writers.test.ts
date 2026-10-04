import { describe, expect, it } from "vitest";

import { toAllowedEmails } from "./writers.ts";

describe("toAllowedEmails", () => {
  it("reads a comma-separated list, ignoring case, spaces and blanks", () => {
    expect([...toAllowedEmails(" Ash@Example.com, ,b@example.com ")]).toEqual([
      "ash@example.com",
      "b@example.com",
    ]);
  });
});
