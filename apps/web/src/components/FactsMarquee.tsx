import { type ReactElement, useEffect, useState } from "react";

import type { DeviceSettings } from "../device/device-settings.ts";
import { facts, firstFactIndexOf } from "../facts/facts.ts";

/** Props for `FactsMarquee`. */
export interface FactsMarqueeProps {
  readonly settings: DeviceSettings;
}

/** How long each fact stays up: long enough to read, rare enough not to pull at the eye. */
const FACT_MILLISECONDS = 30_000;
const LAST_FACT_KEY = "marqueeFact";

/**
 * The strip at the bottom of the editor showing one short fact about books and publishing at a
 * time, each with its source. It works offline, and moves to a new fact each time the writer opens
 * or comes back to the app, so a writer who checks in briefly still sees them all.
 */
export function FactsMarquee({ settings }: FactsMarqueeProps): ReactElement | undefined {
  const [index, setIndex] = useState(() =>
    firstFactIndexOf(settings.read(LAST_FACT_KEY), Date.now()),
  );

  useEffect(() => {
    function showNext(): void {
      setIndex((current) => current + 1);
    }
    // Phones pause timers in the background, so coming back is when a writer needs a new fact.
    function showNextWhenVisible(): void {
      if (document.visibilityState === "visible") showNext();
    }
    const timer = setInterval(showNext, FACT_MILLISECONDS);
    document.addEventListener("visibilitychange", showNextWhenVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", showNextWhenVisible);
    };
  }, []);

  const shownIndex = index % facts.length;
  useEffect(() => {
    settings.write(LAST_FACT_KEY, String(shownIndex));
  }, [settings, shownIndex]);

  const shown = facts[shownIndex];
  if (!shown) return undefined;
  return (
    <footer className="marquee">
      <p key={shown.fact} className="marquee__fact">
        {shown.fact}{" "}
        <a className="marquee__source" href={shown.link} target="_blank" rel="noreferrer">
          {shown.source}
        </a>
      </p>
    </footer>
  );
}
