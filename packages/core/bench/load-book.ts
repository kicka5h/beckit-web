// Milestone 1 exit check: can a 150,000-word manuscript be loaded and read fast enough?
// Builds a book of chapter docs with realistic edit history, saves them, then times a cold load.
// Run with `pnpm bench`. Phones are roughly 3-5x slower than a laptop; budget is 2 s on a phone.
import * as Automerge from "@automerge/automerge";

import {
  applyEdit,
  type Chapter,
  countBlockWords,
  createBlock,
  createChapter,
  readChapter,
} from "../src/index.ts";

const CHAPTERS = 25;
const PARAGRAPHS_PER_CHAPTER = 80;
const EDITS_PER_PARAGRAPH = 3;
const WORD_LIST = [
  "the",
  "river",
  "ferry",
  "pilot",
  "fog",
  "bridge",
  "morning",
  "quiet",
  "water",
  "hull",
  "gulls",
  "pewter",
  "dawn",
] as const;

let randomSeed = 7;

/** Returns the next deterministic pseudo-random number in [0, 1), so every run builds the same book. */
function nextRandom(): number {
  randomSeed = (randomSeed * 16807) % 2147483647;
  return randomSeed / 2147483647;
}

function createSentence(wordCount: number): string {
  const chosen = Array.from(
    { length: wordCount },
    () => WORD_LIST[Math.floor(nextRandom() * WORD_LIST.length)],
  );
  return `${chosen.join(" ")}.`;
}

function createEditedChapter(): Chapter {
  const blocks = Array.from({ length: PARAGRAPHS_PER_CHAPTER }, () =>
    createBlock(createSentence(75)),
  );
  let chapter = createChapter(blocks);
  const order = blocks.map((block) => block.id);
  for (let round = 0; round < EDITS_PER_PARAGRAPH; round++) {
    const changed = blocks.map((block) => ({
      ...block,
      text: `${block.text} ${createSentence(1)}`,
    }));
    chapter = applyEdit(chapter, { order, changed, removed: [] });
  }
  return chapter;
}

function time<Result>(label: string, run: () => Result): Result {
  const start = performance.now();
  const result = run();
  console.log(`${label.padEnd(28)} ${(performance.now() - start).toFixed(0).padStart(6)} ms`);
  return result;
}

const saved = time("build + save", () =>
  Array.from({ length: CHAPTERS }, () => Automerge.save(createEditedChapter())),
);
const bytes = saved.reduce((total, binary) => total + binary.byteLength, 0);
const chapters = time("cold load (all chapters)", () =>
  saved.map((binary) => Automerge.load<Chapter>(binary)),
);
const wordCount = time("read + count words", () => countBlockWords(chapters.flatMap(readChapter)));
time("cold load (one chapter)", () =>
  readChapter(Automerge.load<Chapter>(saved[0] ?? new Uint8Array())),
);

console.log(
  `\n${wordCount.toLocaleString()} words, ${(bytes / 1024 / 1024).toFixed(2)} MB on disk`,
);
