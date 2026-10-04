import factList from "./facts.json" with { type: "json" };

/** How often a fact's figure changes, and so how often the refresh job re-checks it. */
export const REFRESH_KINDS = ["Rarely", "Yearly", "New survey"] as const;

/** One of `REFRESH_KINDS`. */
export type RefreshKind = (typeof REFRESH_KINDS)[number];

/** A short fact about books or publishing, with the source a writer can check it against. */
export interface Fact {
  readonly fact: string;
  readonly source: string;
  readonly link: string;
  /** The day it was last checked against its source, as YYYY-MM-DD. */
  readonly checked: string;
  readonly refresh: RefreshKind;
}

const DAY_MILLISECONDS = 86_400_000;
const CHECKED_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_LINK = /^https:\/\/\S+$/;
const ANY_TEXT = /\S/;

function fieldOf(value: object, key: keyof Fact): unknown {
  return Reflect.get(value, key);
}

function isText(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

function isRefreshKind(value: unknown): value is RefreshKind {
  return (REFRESH_KINDS as readonly unknown[]).includes(value);
}

/** Whether an entry of facts.json is a complete fact with an https source. */
export function isFact(value: unknown): value is Fact {
  if (typeof value !== "object" || value === null) return false;
  return (
    isText(fieldOf(value, "fact"), ANY_TEXT) &&
    isText(fieldOf(value, "source"), ANY_TEXT) &&
    isText(fieldOf(value, "link"), HTTPS_LINK) &&
    isText(fieldOf(value, "checked"), CHECKED_DATE) &&
    isRefreshKind(fieldOf(value, "refresh"))
  );
}

/**
 * The facts the marquee shows. They ship with the app, so the marquee works offline and needs no
 * sync; a device picks up a refreshed list with the next deploy. facts.test.ts fails if any entry
 * is incomplete, so none is ever dropped here unnoticed.
 */
export const facts: readonly Fact[] = factList.filter(isFact);

/**
 * The index of the fact to show when the marquee appears: the one after the fact last shown on
 * this device, or, on a device that has shown none, a different one each day.
 */
export function firstFactIndexOf(lastShown: string | undefined, now: number): number {
  const last = Number(lastShown);
  if (lastShown === undefined || !Number.isInteger(last)) return Math.floor(now / DAY_MILLISECONDS);
  return last + 1;
}
