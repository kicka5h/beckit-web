import { describe, expect, it } from "vitest";

import { countWordForms, familyOf, normalizeWord } from "./word-forms.ts";

describe("normalizeWord", () => {
  it("lowercases, straightens apostrophes and drops a possessive", () => {
    expect(normalizeWord("Mira’s")).toBe("mira");
    expect(normalizeWord("writers'")).toBe("writers");
    expect(normalizeWord("Don’t")).toBe("don't");
  });
});

describe("familyOf", () => {
  const cases: readonly (readonly [string, readonly string[]])[] = [
    ["look", ["look", "looks", "looked", "looking", "Looked"]],
    ["make", ["make", "makes", "making"]],
    ["hop", ["hop", "hops", "hopped", "hopping"]],
    ["carry", ["carry", "carries", "carried", "carrying"]],
    ["box", ["box", "boxes"]],
    ["wish", ["wish", "wishes", "wished"]],
  ];

  it.each(cases)("gives every regular form of %s one key", (_word, forms) => {
    expect(new Set(forms.map(familyOf)).size).toBe(1);
  });

  it("leaves short words and words ending in ss or us whole", () => {
    expect(familyOf("is")).not.toBe(familyOf("i"));
    expect(familyOf("was")).toBe("was");
    expect(familyOf("glass")).not.toBe(familyOf("glas"));
    expect(familyOf("bus")).toBe("bus");
  });

  it("keeps irregular forms apart", () => {
    expect(familyOf("made")).not.toBe(familyOf("make"));
  });
});

describe("countWordForms", () => {
  const texts = [
    "She looked up. He looks back, looking for her there.",
    "They look and look again; nobody LOOKED away.",
  ];

  it("counts each form of the word separately, most frequent first", () => {
    expect(countWordForms(texts, "looked")).toEqual([
      { form: "look", count: 2 },
      { form: "looked", count: 2 },
      { form: "looking", count: 1 },
      { form: "looks", count: 1 },
    ]);
  });

  it("matches whole words only", () => {
    expect(countWordForms(texts, "her")).toEqual([{ form: "her", count: 1 }]);
  });

  it("finds nothing for a word that is not there", () => {
    expect(countWordForms(texts, "ferry")).toEqual([]);
  });
});
