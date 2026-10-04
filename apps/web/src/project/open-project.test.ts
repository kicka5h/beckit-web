import { type DocHandle, generateAutomergeUrl, type Repo } from "@automerge/automerge-repo";
import { beforeEach, describe, expect, it } from "vitest";

import { type ChapterDoc, createNodeId, insertNode, piecesOf } from "@beckit/core";

import type { DeviceSettings } from "../device/device-settings.ts";
import { openProject, rememberTarget } from "./open-project.ts";
import { createMemorySettings, createTestRepo } from "./test-project.ts";

function chapterOf(handle: DocHandle<ChapterDoc> | undefined): DocHandle<ChapterDoc> {
  if (!handle) throw new Error("Expected a piece with a chapter");
  return handle;
}

describe("openProject", () => {
  let repo: Repo;
  let settings: DeviceSettings;

  beforeEach(() => {
    repo = createTestRepo();
    settings = createMemorySettings();
  });

  it("starts a blank, untitled project on one empty page on first launch", async () => {
    const project = await openProject(repo, settings);
    const manuscript = project.manuscript.doc();
    expect(manuscript.title).toBe("Untitled");
    expect(manuscript.format).toBe("blank");
    expect(piecesOf(manuscript, "body").map(({ id }) => id)).toEqual([project.nodeId]);
    expect(chapterOf(project.chapter).doc().order).toEqual([]);
  });

  it("lists the project in the device's library", async () => {
    const project = await openProject(repo, settings);
    expect(project.library.doc().projects).toEqual([project.manuscript.url]);
    await openProject(repo, settings);
    expect(project.library.doc().projects).toHaveLength(1);
  });

  it("reopens the same project, page and chapter", async () => {
    const first = await openProject(repo, settings);
    const second = await openProject(repo, settings);
    expect(second.manuscript.url).toBe(first.manuscript.url);
    expect(second.nodeId).toBe(first.nodeId);
    expect(second.chapter?.url).toBe(first.chapter?.url);
  });

  it("opens the first piece when the remembered piece is gone", async () => {
    const first = await openProject(repo, settings);
    rememberTarget(settings, { nodeId: createNodeId() });
    expect((await openProject(repo, settings)).nodeId).toBe(first.nodeId);
  });

  it("adds a piece when the project has none", async () => {
    const first = await openProject(repo, settings);
    first.manuscript.change((doc) => {
      doc.body.splice(0, 1);
      Reflect.deleteProperty(doc.nodes, first.nodeId);
    });
    const second = await openProject(repo, settings);
    expect(second.nodeId).not.toBe(first.nodeId);
    expect(piecesOf(second.manuscript.doc(), "body")).toHaveLength(1);
  });

  it("opens front matter when the body is empty", async () => {
    const first = await openProject(repo, settings);
    const dedication = createNodeId();
    first.manuscript.change((doc) => {
      doc.body.splice(0, 1);
      insertNode(
        doc,
        { parent: "front", index: 0 },
        { kind: "piece", title: "Dedication", chapterUrl: chapterOf(first.chapter).url, words: 0 },
        dedication,
      );
    });
    rememberTarget(settings, {});
    expect((await openProject(repo, settings)).nodeId).toBe(dedication);
  });

  it("opens a contents page, which has no chapter of its own", async () => {
    const first = await openProject(repo, settings);
    const contents = createNodeId();
    first.manuscript.change((doc) => {
      insertNode(
        doc,
        { parent: "front", index: 0 },
        { kind: "contents", title: "Contents" },
        contents,
      );
    });
    rememberTarget(settings, { nodeId: contents });
    const project = await openProject(repo, settings);
    expect(project.nodeId).toBe(contents);
    expect(project.chapter).toBeUndefined();
  });

  it("opens another project when told to", async () => {
    const first = await openProject(repo, settings);
    rememberTarget(settings, { manuscriptUrl: generateAutomergeUrl() });
    const second = await openProject(repo, settings);
    expect(second.manuscript.url).not.toBe(first.manuscript.url);
    expect(second.library.doc().projects).toHaveLength(2);
  });

  it("gives a piece a fresh chapter when its text is not on this device", async () => {
    const first = await openProject(repo, settings);
    const missing = generateAutomergeUrl();
    first.manuscript.change((doc) => {
      const node = doc.nodes[first.nodeId];
      if (node?.kind === "piece") node.chapterUrl = missing;
    });
    const second = await openProject(repo, settings);
    const piece = second.manuscript.doc().nodes[second.nodeId];
    expect(second.chapter?.url).not.toBe(missing);
    expect(piece?.kind === "piece" && piece.chapterUrl).toBe(second.chapter?.url);
  });
});
