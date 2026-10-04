import { type ReactElement, useEffect, useState } from "react";

import type { DeviceSettings } from "../device/device-settings.ts";
import { facts, firstFactIndexOf } from "../facts/facts.ts";
import { useIsOnline } from "../hooks/use-is-online.ts";

/** Props for `FactsMarquee`. */
export interface FactsMarqueeProps {
  readonly settings: DeviceSettings;
}

/** How long each fact stays up while online: long enough to read twice. */
const FACT_MILLISECONDS = 20_000;
const LAST_FACT_KEY = "marqueeFact";

/**
 * The strip at the bottom of the editor showing one short fact about books and publishing at a
 * time, each with its source. Online, it moves on every 20 seconds; offline, it holds still. It
 * also moves on each time the writer opens or comes back to the app, so a writer who checks in
 * briefly still sees them all.
 */
export function FactsMarquee({ settings }: FactsMarqueeProps): ReactElement | undefined {
  const [index, setIndex] = useState(() =>
    firstFactIndexOf(settings.read(LAST_FACT_KEY), Date.now()),
  );

  const isOnline = useIsOnline();

  useEffect(() => {
    // Phones pause timers in the background, so coming back is when a writer needs a new fact.
    function showNextWhenVisible(): void {
      if (document.visibilityState === "visible") setIndex((current) => current + 1);
    }
    document.addEventListener("visibilitychange", showNextWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", showNextWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => current + 1);
    }, FACT_MILLISECONDS);
    return () => {
      clearInterval(timer);
    };
  }, [isOnline]);

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
