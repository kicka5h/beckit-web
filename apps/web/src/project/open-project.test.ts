import { generateAutomergeUrl, type Repo } from "@automerge/automerge-repo";
import { beforeEach, describe, expect, it } from "vitest";

import { createNodeId, insertNode, piecesOf } from "@beckit/core";

import type { DeviceSettings } from "../device/device-settings.ts";
import { openProject } from "./open-project.ts";
import { createMemorySettings, createTestRepo } from "./test-project.ts";

describe("openProject", () => {
  let repo: Repo;
  let settings: DeviceSettings;

  beforeEach(() => {
    repo = createTestRepo();
    settings = createMemorySettings();
  });

  it("starts an untitled project with one empty piece on first launch", async () => {
    const project = await openProject(repo, settings);
    const manuscript = project.manuscript.doc();
    expect(manuscript.title).toBe("Untitled");
    expect(piecesOf(manuscript, "body").map(({ id }) => id)).toEqual([project.pieceId]);
    expect(project.chapter.doc().order).toEqual([]);
  });

  it("reopens the same project, piece and chapter", async () => {
    const first = await openProject(repo, settings);
    const second = await openProject(repo, settings);
    expect(second.manuscript.url).toBe(first.manuscript.url);
    expect(second.pieceId).toBe(first.pieceId);
    expect(second.chapter.url).toBe(first.chapter.url);
  });

  it("opens the first piece when the remembered piece is gone", async () => {
    const first = await openProject(repo, settings);
    settings.write("piece", createNodeId());
    expect((await openProject(repo, settings)).pieceId).toBe(first.pieceId);
  });

  it("adds a piece when the project has none", async () => {
    const first = await openProject(repo, settings);
    first.manuscript.change((doc) => {
      doc.body.splice(0, 1);
      Reflect.deleteProperty(doc.nodes, first.pieceId);
    });
    const second = await openProject(repo, settings);
    expect(second.pieceId).not.toBe(first.pieceId);
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
        { kind: "piece", title: "Dedication", chapterUrl: first.chapter.url, words: 0 },
        dedication,
      );
    });
    settings.write("piece", "");
    expect((await openProject(repo, settings)).pieceId).toBe(dedication);
  });

  it("starts a new project when the remembered one is not on this device", async () => {
    settings.write("manuscript", generateAutomergeUrl());
    const project = await openProject(repo, settings);
    expect(settings.read("manuscript")).toBe(project.manuscript.url);
  });

  it("gives a piece a fresh chapter when its text is not on this device", async () => {
    const first = await openProject(repo, settings);
    const missing = generateAutomergeUrl();
    first.manuscript.change((doc) => {
      const node = doc.nodes[first.pieceId];
      if (node?.kind === "piece") node.chapterUrl = missing;
    });
    const second = await openProject(repo, settings);
    const piece = second.manuscript.doc().nodes[second.pieceId];
    expect(second.chapter.url).not.toBe(missing);
    expect(piece?.kind === "piece" && piece.chapterUrl).toBe(second.chapter.url);
  });
});
