import { type BlockSnapshot, createBlock } from "./block.ts";
import type { Part } from "./manuscript.ts";

/** A page a format makes: a piece with placeholder text, or a contents page drawn from the tree. */
export interface FormatPage {
  readonly title: string;
  /** Placeholder paragraphs; a contents page has none. */
  readonly text: readonly string[];
  readonly isContents?: boolean;
}

/**
 * A publication type to start a project from. It is a template, not a rule: it pre-makes the front
 * and back matter its type expects and names the body's units, and everything it makes can be
 * edited, moved or removed afterwards.
 */
export interface Format {
  readonly id: string;
  readonly name: string;
  /** What one piece of the body is called: "Chapter", "Essay", "Poem". */
  readonly unit: string;
  /** What a group of body pieces is called: "Part", "Section". */
  readonly group: string;
  /** The title of the empty piece a new project opens on; the first unit ("Chapter 1") if unset. */
  readonly firstTitle?: string;
  readonly front: readonly FormatPage[];
  readonly back: readonly FormatPage[];
}

/** A page a new project starts with, its text as blocks, in the part it belongs to. */
export interface PlannedPage {
  readonly part: Part;
  readonly title: string;
  readonly blocks: readonly BlockSnapshot[];
  readonly isContents: boolean;
}

const TITLE_PAGE: FormatPage = { title: "Title page", text: ["Title", "Author"] };
const COPYRIGHT: FormatPage = {
  title: "Copyright",
  text: ["Copyright © Year Author. All rights reserved."],
};
const DEDICATION: FormatPage = { title: "Dedication", text: ["For …"] };
const EPIGRAPH: FormatPage = {
  title: "Epigraph",
  text: ["A line that sets the tone.", "— Its author"],
};
const CONTENTS: FormatPage = { title: "Contents", text: [], isContents: true };
const NOTES: FormatPage = { title: "Notes", text: ["Sources and notes, piece by piece."] };
const CREDITS: FormatPage = {
  title: "Publication credits",
  text: ["“Title” first appeared in Publication, Year."],
};
const ACKNOWLEDGMENTS: FormatPage = { title: "Acknowledgments", text: ["Thank you to …"] };
const ABOUT: FormatPage = { title: "About the author", text: ["Author lives in …"] };

/** The title of anything not yet named: a new project, or a blank project's first page. */
export const UNTITLED = "Untitled";

/** Whatever the writer builds: no front or back matter, and a first page with no name yet. */
export const BLANK_FORMAT: Format = {
  id: "blank",
  name: "Blank",
  unit: "Piece",
  group: "Section",
  firstTitle: UNTITLED,
  front: [],
  back: [],
};

/** The formats a project can start from. Formats are plain data: adding one needs no schema change. */
export const FORMATS: readonly Format[] = [
  {
    id: "chapterBook",
    name: "Chapter book",
    unit: "Chapter",
    group: "Part",
    front: [
      { title: "Half title", text: ["Title"] },
      TITLE_PAGE,
      COPYRIGHT,
      DEDICATION,
      EPIGRAPH,
      CONTENTS,
    ],
    back: [ACKNOWLEDGMENTS, ABOUT, { title: "Also by the author", text: ["Other titles"] }],
  },
  {
    id: "essayCollection",
    name: "Essay collection",
    unit: "Essay",
    group: "Section",
    front: [
      TITLE_PAGE,
      COPYRIGHT,
      DEDICATION,
      CONTENTS,
      { title: "Introduction", text: ["What these essays share, and why they are together."] },
    ],
    back: [NOTES, CREDITS, ACKNOWLEDGMENTS, ABOUT],
  },
  {
    id: "poetryCollection",
    name: "Poetry collection",
    unit: "Poem",
    group: "Section",
    front: [TITLE_PAGE, COPYRIGHT, DEDICATION, EPIGRAPH, CONTENTS],
    back: [NOTES, CREDITS, ACKNOWLEDGMENTS, ABOUT],
  },
  {
    id: "biography",
    name: "Biography or memoir",
    unit: "Chapter",
    group: "Part",
    front: [
      TITLE_PAGE,
      COPYRIGHT,
      DEDICATION,
      CONTENTS,
      { title: "Foreword", text: ["A few words from someone else."] },
      { title: "Preface", text: ["Why this story, and how it was gathered."] },
    ],
    back: [
      { title: "Afterword", text: ["What happened next."] },
      { title: "Chronology", text: ["Year: what happened."] },
      NOTES,
      { title: "Bibliography", text: ["Author. Title. Publisher, Year."] },
      ACKNOWLEDGMENTS,
      ABOUT,
    ],
  },
  BLANK_FORMAT,
];

/** The format with `id`, or Blank if there is none: a project whose format is unknown is still a project. */
export function formatOf(id: string): Format {
  return FORMATS.find((format) => format.id === id) ?? BLANK_FORMAT;
}

/** The title of the body's piece number `number` in this format: "Chapter 3", "Poem 12". */
export function pieceTitleOf({ unit }: Format, number: number): string {
  return `${unit} ${String(number)}`;
}

/** The title of the body's group number `number` in this format: "Part 2", "Section 4". */
export function groupTitleOf({ group }: Format, number: number): string {
  return `${group} ${String(number)}`;
}

/** The title of the empty piece a new project in this format opens on. */
export function firstTitleOf(format: Format): string {
  return format.firstTitle ?? pieceTitleOf(format, 1);
}

function toPlannedPage(part: Part, { title, text, isContents = false }: FormatPage): PlannedPage {
  return { part, title, blocks: text.map((paragraph) => createBlock(paragraph)), isContents };
}

/**
 * The pages a new project starts with: the format's front matter, one empty first piece of the
 * body, then its back matter.
 */
export function planProject(format: Format): PlannedPage[] {
  return [
    ...format.front.map((page) => toPlannedPage("front", page)),
    { part: "body", title: firstTitleOf(format), blocks: [], isContents: false },
    ...format.back.map((page) => toPlannedPage("back", page)),
  ];
}
