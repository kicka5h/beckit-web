import type { BlockSnapshot } from "./block.ts";
import familiarWordList from "./familiar-words.json" with { type: "json" };
import { memoize } from "./memoize.ts";
import { wordsOf } from "./text.ts";
import { normalizeWord } from "./word-forms.ts";

/** What the Dale–Chall formula reads from a passage. */
export interface PassageStats {
  readonly words: number;
  /** Words outside the list of about 3,000 familiar words. */
  readonly difficultWords: number;
  readonly sentences: number;
}

/** A Dale–Chall estimate: the raw score and the school level it maps to. */
export interface ReadingLevel {
  readonly score: number;
  readonly label: string;
}

/**
 * The New Dale–Chall list of familiar words (1995), as published in the MIT-licensed `dale-chall`
 * package by Titus Wormer. See THIRD_PARTY_NOTICES.md.
 */
const FAMILIAR_WORDS: ReadonlySet<string> = new Set(familiarWordList);

/** Score ceilings and the level each maps to, from the Dale–Chall readability formula. */
const LEVELS = [
  { below: 5, label: "4th grade or lower" },
  { below: 6, label: "5th–6th grade" },
  { below: 7, label: "7th–8th grade" },
  { below: 8, label: "9th–10th grade" },
  { below: 9, label: "11th–12th grade" },
] as const;

/** The level for a score of 9.0 or higher. */
const TOP_LEVEL = "College";

const DIFFICULT_WEIGHT = 0.1579;
const SENTENCE_WEIGHT = 0.0496;
/** Added when difficult words pass 5% of the passage. */
const DIFFICULT_ADJUSTMENT = 3.6365;
const DIFFICULT_THRESHOLD_PERCENT = 5;
/** The formula needs at least two sentences; below that the level reads N/A. */
const MIN_SENTENCES = 2;

const TERMINAL_RUN = /[.!?…]+/g;
const CLOSERS: ReadonlySet<string> = new Set(['"', "'", "’", "”", ")", "]"]);
const OPENERS: ReadonlySet<string> = new Set(['"', "'", "“", "‘", "(", "["]);
const CAPITAL = /^\p{Lu}$/u;
const SPACE = /^\s$/;
const DIGIT = /\p{N}/u;
const Y_PLURAL_OR_PAST = /ie[sd]$/;
/** Regular endings a familiar word may carry and stay familiar. */
const INFLECTION_SUFFIXES = ["s", "es", "d", "ed", "ing", "r", "er", "st", "est"] as const;
const EMPTY_STATS: PassageStats = { words: 0, difficultWords: 0, sentences: 0 };

/** The bases a regular inflection of a familiar word could come from: -s, -es, -ed, -ing, -er, -est. */
function basesOf(word: string): string[] {
  const bases = [word];
  for (const suffix of INFLECTION_SUFFIXES) {
    if (!word.endsWith(suffix)) continue;
    const stem = word.slice(0, -suffix.length);
    bases.push(stem, `${stem}e`, stem.slice(0, -1));
  }
  if (Y_PLURAL_OR_PAST.test(word)) bases.push(`${word.slice(0, -3)}y`);
  return bases;
}

/** Whether a word counts as familiar: on the list, a regular form of a word on it, or a number. */
function isFamiliar(word: string): boolean {
  if (DIGIT.test(word)) return true;
  return basesOf(normalizeWord(word)).some((base) => FAMILIAR_WORDS.has(base));
}

/** The index of the first character from `index` on that `isSkipped` rejects. */
function skipFrom(text: string, index: number, isSkipped: (char: string) => boolean): number {
  let position = index;
  while (position < text.length && isSkipped(text.charAt(position))) position++;
  return position;
}

/**
 * Whether punctuation ending at `index` ends a sentence: a capital starts the next one, after
 * closing quotes and a space. "“Wait!” she said." is one sentence; "3.5" and "U.S." end none.
 */
function endsSentenceAt(line: string, index: number): boolean {
  const afterClosers = skipFrom(line, index, (char) => CLOSERS.has(char));
  const afterSpace = skipFrom(line, afterClosers, (char) => SPACE.test(char));
  if (afterSpace === afterClosers || afterSpace === line.length) return false;
  const next = OPENERS.has(line.charAt(afterSpace)) ? afterSpace + 1 : afterSpace;
  return CAPITAL.test(line.charAt(next));
}

function countSentences(line: string): number {
  const ends = [...line.matchAll(TERMINAL_RUN)].filter((match) =>
    endsSentenceAt(line, match.index + match[0].length),
  ).length;
  // The line's end closes its last sentence, punctuated or not (a heading, a fragment).
  return ends + 1;
}

function measureLine(line: string): PassageStats {
  const words = wordsOf(line);
  if (words.length === 0) return { words: 0, difficultWords: 0, sentences: 0 };
  return {
    words: words.length,
    difficultWords: words.filter((word) => !isFamiliar(word)).length,
    sentences: countSentences(line),
  };
}

// Each snapshot is measured once, so unchanged blocks cost nothing when the chapter is re-scored.
const blockStatsOf = memoize((block: BlockSnapshot) => measureLine(block.text));

function addStats(a: PassageStats, b: PassageStats): PassageStats {
  return {
    words: a.words + b.words,
    difficultWords: a.difficultWords + b.difficultWords,
    sentences: a.sentences + b.sentences,
  };
}

/** Measures a passage of text. Each line counts as its own paragraph. */
export function measureText(text: string): PassageStats {
  return text.split("\n").map(measureLine).reduce(addStats, EMPTY_STATS);
}

/** Measures a chapter's blocks. */
export function measureBlocks(blocks: readonly BlockSnapshot[]): PassageStats {
  return blocks.map(blockStatsOf).reduce(addStats, EMPTY_STATS);
}

/**
 * Estimates a passage's reading level with the Dale–Chall formula, as WordCounter does: the share
 * of difficult words and the average sentence length. English only. Undefined below two sentences.
 */
export function readingLevelOf({
  words,
  difficultWords,
  sentences,
}: PassageStats): ReadingLevel | undefined {
  if (sentences < MIN_SENTENCES) return undefined;
  const difficultPercent = (difficultWords / words) * 100;
  const adjustment = difficultPercent > DIFFICULT_THRESHOLD_PERCENT ? DIFFICULT_ADJUSTMENT : 0;
  const score =
    DIFFICULT_WEIGHT * difficultPercent + SENTENCE_WEIGHT * (words / sentences) + adjustment;
  const label = LEVELS.find(({ below }) => score < below)?.label ?? TOP_LEVEL;
  return { score, label };
}
