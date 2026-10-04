import { describe, expect, it } from "vitest";

import { type ChapterDoc, formatOf, outlineOf, readChapter } from "@beckit/core";

import { createProject } from "./create-project.ts";
import { findStored } from "./documents.ts";
import { createTestRepo } from "./test-project.ts";

describe("createProject", () => {
  it("pre-makes a format's pages and opens on its first piece", () => {
    const repo = createTestRepo();
    const { manuscript, firstPieceId } = createProject(repo, formatOf("poetryCollection"));
    const outline = outlineOf(manuscript.doc());
    expect(outline.map(({ node, part }) => `${part}: ${node.title}`)).toContain("body: Poem 1");
    expect(manuscript.doc().nodes[firstPieceId]?.title).toBe("Poem 1");
    expect(outline.find(({ node }) => node.kind === "contents")?.part).toBe("front");
  });

  it("gives every pre-made page its own chapter, holding its placeholder text", async () => {
    const repo = createTestRepo();
    const { manuscript } = createProject(repo, formatOf("chapterBook"));
    const dedication = outlineOf(manuscript.doc()).find(({ node }) => node.title === "Dedication");
    const url = dedication?.node.kind === "piece" ? dedication.node.chapterUrl : undefined;
    const chapter = await findStored<ChapterDoc>(repo, url);
    expect(chapter && readChapter(chapter.doc()).map(({ text }) => text)).toEqual(["For …"]);
  });
});
