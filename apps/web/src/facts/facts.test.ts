import { describe, expect, it } from "vitest";

import factList from "./facts.json" with { type: "json" };
import { facts, firstFactIndexOf, isFact } from "./facts.ts";

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

describe("firstFactIndexOf", () => {
  const day = 86_400_000;

  it("moves on from the fact last shown on this device", () => {
    expect(firstFactIndexOf("6", 20_000 * day)).toBe(7);
  });

  it("starts on a different fact each day on a device that has shown none", () => {
    expect(firstFactIndexOf(undefined, 20_000 * day)).toBe(20_000);
    expect(firstFactIndexOf(undefined, 20_001 * day)).toBe(20_001);
  });

  it("ignores a stored value that is not an index", () => {
    expect(firstFactIndexOf("soon", 20_000 * day)).toBe(20_000);
  });
});
