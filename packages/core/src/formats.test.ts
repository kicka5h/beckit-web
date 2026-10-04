import { describe, expect, it } from "vitest";

import {
  BLANK_FORMAT,
  formatOf,
  FORMATS,
  groupTitleOf,
  pieceTitleOf,
  planProject,
} from "./formats.ts";

describe("formatOf", () => {
  it("finds a format by id and falls back to Blank", () => {
    expect(formatOf("poetryCollection").unit).toBe("Poem");
    expect(formatOf("unknown")).toBe(BLANK_FORMAT);
  });
});

describe("pieceTitleOf", () => {
  it("numbers the format's units and groups", () => {
    expect(pieceTitleOf(formatOf("poetryCollection"), 12)).toBe("Poem 12");
    expect(groupTitleOf(formatOf("chapterBook"), 2)).toBe("Part 2");
  });
});

describe("planProject", () => {
  it("pre-makes a chapter book's front matter, a first chapter and its back matter", () => {
    const pages = planProject(formatOf("chapterBook"));
    expect(pages.map(({ part, title }) => `${part}: ${title}`)).toEqual([
      "front: Half title",
      "front: Title page",
      "front: Copyright",
      "front: Dedication",
      "front: Epigraph",
      "front: Contents",
      "body: Chapter 1",
      "back: Acknowledgments",
      "back: About the author",
      "back: Also by the author",
    ]);
  });

  it("fills pre-made pages with placeholder text, except contents pages", () => {
    const pages = planProject(formatOf("chapterBook"));
    const dedication = pages.find(({ title }) => title === "Dedication");
    const contents = pages.find(({ isContents }) => isContents);
    expect(dedication?.blocks.map(({ text }) => text)).toEqual(["For …"]);
    expect(contents?.blocks).toEqual([]);
  });

  it("starts a blank project on one untitled empty page", () => {
    expect(planProject(BLANK_FORMAT)).toEqual([
      { part: "body", title: "Untitled", blocks: [], isContents: false },
    ]);
  });

  it("names every format's first piece and gives every format a contents page or none at all", () => {
    for (const format of FORMATS) {
      const pages = planProject(format);
      expect(pages.filter(({ part }) => part === "body")).toHaveLength(1);
      expect(pages.filter(({ isContents }) => isContents).length).toBeLessThanOrEqual(1);
    }
  });
});
