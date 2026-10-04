import { describe, expect, it } from "vitest";

import factList from "./facts.json" with { type: "json" };
import { facts, isFact } from "./facts.ts";

describe("facts", () => {
  it("ships every entry of facts.json, each complete and sourced", () => {
    expect(factList.length).toBeGreaterThan(0);
    expect(facts).toHaveLength(factList.length);
  });

  it("never repeats a fact", () => {
    expect(new Set(facts.map(({ fact }) => fact)).size).toBe(facts.length);
  });
});

describe("isFact", () => {
  const valid = {
    fact: "Every ISBN has had 13 digits since 1 January 2007.",
    source: "International ISBN Agency",
    link: "https://www.isbn-international.org/node/10",
    checked: "2026-10-04",
    refresh: "Rarely",
  };

  it("accepts a complete fact", () => {
    expect(isFact(valid)).toBe(true);
  });

  it("rejects missing or malformed fields", () => {
    expect(isFact(undefined)).toBe(false);
    expect(isFact({ ...valid, link: "http://example.com" })).toBe(false);
    expect(isFact({ ...valid, checked: "4 October 2026" })).toBe(false);
    expect(isFact({ ...valid, refresh: "Monthly" })).toBe(false);
    expect(isFact({ ...valid, fact: " " })).toBe(false);
  });
});
