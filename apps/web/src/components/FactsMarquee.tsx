import { type ReactElement, useEffect, useState } from "react";

import { facts } from "../facts/facts.ts";

/** How long each fact stays up: long enough to read, rare enough not to pull at the eye. */
const FACT_MILLISECONDS = 30_000;
const DAY_MILLISECONDS = 86_400_000;

/**
 * The strip at the bottom of the editor showing one short fact about books and publishing at a
 * time, each with its source. It starts on a different fact each day and works offline.
 */
export function FactsMarquee(): ReactElement | undefined {
  const [index, setIndex] = useState(() => Math.floor(Date.now() / DAY_MILLISECONDS));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => current + 1);
    }, FACT_MILLISECONDS);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const shown = facts[index % facts.length];
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
