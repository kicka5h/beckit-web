import { wordsOf } from "./text.ts";

/** How often one form of a word appears, as `countWordForms` reports it. */
export interface WordFormCount {
  readonly form: string;
  readonly count: number;
}

/** Inflections stripped to find a word's family, longest first. `es` only follows a hissing sound. */
const INFLECTIONS = [
  { suffix: "ies", base: "y" },
  { suffix: "ied", base: "y" },
  { suffix: "ing", base: "" },
  { suffix: "ed", base: "" },
] as const;

const HISSING_PLURAL = /(?:s|x|z|ch|sh)es$/;
const PLAIN_PLURAL = /[^su]s$/;
const DOUBLED_ENDING = /([^aeiou])\1$/;
/** The shortest stem an inflection may leave, so "is", "was" and "bus" stay whole. */
const MIN_STEM = 3;

/** A word as compared: lowercase, curly apostrophes made straight, a possessive dropped. */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replaceAll("’", "'").replace(/'s?$/, "");
}

function stripInflection(word: string): string {
  for (const { suffix, base } of INFLECTIONS) {
    const stem = word.slice(0, -suffix.length);
    if (word.endsWith(suffix) && stem.length >= MIN_STEM) return stem + base;
  }
  if (HISSING_PLURAL.test(word) && word.length - 2 >= MIN_STEM) return word.slice(0, -2);
  if (PLAIN_PLURAL.test(word) && word.length - 1 >= MIN_STEM) return word.slice(0, -1);
  return word;
}

/**
 * A key shared by the regular forms of one word: look, looks, looked and looking; make, makes and
 * making; hop, hops and hopping. Irregular forms (made, ran) keep their own key.
 */
export function familyOf(word: string): string {
  return stripInflection(normalizeWord(word)).replace(DOUBLED_ENDING, "$1").replace(/e$/, "");
}

/**
 * Counts each form of `word` in `texts`, whole words only and ignoring capitals, so "her" is never
 * found inside "there". Every form gets its own count: highlight "looked" and see look, looked and
 * looking, each with its number, most frequent first.
 */
export function countWordForms(texts: readonly string[], word: string): WordFormCount[] {
  const family = familyOf(word);
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const found of wordsOf(text)) {
      if (familyOf(found) !== family) continue;
      const form = normalizeWord(found);
      counts.set(form, (counts.get(form) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([form, count]) => ({ form, count }))
    .toSorted((a, b) => b.count - a.count || a.form.localeCompare(b.form));
}
