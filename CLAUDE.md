# Beckit

Local-first writing app: offline PWA, Automerge sync, per-paragraph history.
Design doc: https://claude.ai/code/artifact/ca3d1c43-425c-43b9-8cf2-044eeae20617

## Rules

@CONTRIBUTING.md

@STYLE.md

## Working here

- Run `pnpm check` before calling any task done. Report failures, never weaken a lint rule.
- Before writing a helper, search `packages/core/src` and `apps/web/src/editor` for an existing one.
- Treat `packages/core` as protected: change it only when the task requires it, and say so.
- Match the surrounding code exactly; if STYLE.md and existing code disagree, STYLE.md wins.
- Keep milestone scope: build what the current milestone in the design doc asks for, nothing more.
- After finishing a milestone, run a separate review focused only on duplication and readability.

## Map

- `packages/core` — pure domain logic: block ids, marks, chapter and manuscript docs (Automerge), diffing.
- `apps/web/src/editor` — TipTap setup, block-id plugin, editor ↔ snapshot conversion.
- `apps/web/src/chapter` — the open chapter's session (batching edits into Automerge).
- `apps/web/src/project` — opening the project and piece this device had open.
- `apps/web/src/device` — device storage (automerge-repo on IndexedDB), local settings, platform checks.
- `apps/web/src/facts` — the marquee's `facts.json`, refreshed every six months (`facts-refresh.yml`).
- `apps/web/e2e` — Playwright tests of the built app, offline included (`pnpm e2e`).
- `apps/web/src/theme` — design tokens (`tokens.css`) and global styles.
