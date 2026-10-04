/**
 * Milestone 1 exit check: can a 150,000-word manuscript be loaded and read fast enough?
 * Builds a book of chapter docs with realistic edit history, saves them, then times a cold load.
 * Run with `pnpm bench`. Phones are roughly 3-5x slower than a laptop; budget is 2 s on a phone.
 */
import * as A from "@automerge/automerge";
import {
  applyEdit,
  countWords,
  createChapter,
  newBlock,
  readChapter,
  type Chapter,
} from "../src/index.ts";

const CHAPTERS = 25;
const PARAGRAPHS_PER_CHAPTER = 80;
const EDITS_PER_PARAGRAPH = 3;
const WORDS = "the river ferry pilot fog bridge morning quiet water hull gulls pewter dawn".split(
  " ",
);

let seed = 7;
const random = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const sentence = (words: number): string =>
  Array.from({ length: words }, () => WORDS[Math.floor(random() * WORDS.length)]).join(" ") + ".";

function buildChapter(index: number): Chapter {
  const blocks = Array.from({ length: PARAGRAPHS_PER_CHAPTER }, () => newBlock(sentence(75)));
  let chapter = createChapter(`Chapter ${String(index + 1)}`, blocks);
  const order = blocks.map((b) => b.id);
  for (let round = 0; round < EDITS_PER_PARAGRAPH; round++) {
    const changed = blocks.map((b) => ({ ...b, text: `${b.text} ${sentence(1)}` }));
    chapter = applyEdit(chapter, { order, changed, removed: [] });
  }
  return chapter;
}

const time = <T>(label: string, run: () => T): T => {
  const start = performance.now();
  const result = run();
  console.log(`${label.padEnd(28)} ${(performance.now() - start).toFixed(0).padStart(6)} ms`);
  return result;
};

const saved = time("build + save", () =>
  Array.from({ length: CHAPTERS }, (_, i) => A.save(buildChapter(i))),
);
const bytes = saved.reduce((sum, b) => sum + b.byteLength, 0);
const chapters = time("cold load (all chapters)", () => saved.map((b) => A.load<Chapter>(b)));
const words = time("read + count words", () =>
  chapters.flatMap(readChapter).reduce((sum, b) => sum + countWords(b.text), 0),
);
time("cold load (one chapter)", () => readChapter(A.load(saved[0] ?? new Uint8Array())));

console.log(`\n${words.toLocaleString()} words, ${(bytes / 1024 / 1024).toFixed(2)} MB on disk`);
