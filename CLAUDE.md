# Beckit

Local-first writing app: offline PWA, Automerge sync, per-paragraph history.
Design doc: https://claude.ai/code/artifact/ca3d1c43-425c-43b9-8cf2-044eeae20617

## Rules

@CONTRIBUTING.md

## Working here

- Run `pnpm check` before calling any task done. Report failures, never weaken a lint rule.
- Before writing a helper, search `packages/core/src` and `apps/web/src/editor` for an existing one.
- Keep milestone scope: build what the current milestone in the design doc asks for, nothing more.
- After finishing a milestone, run a separate review focused only on duplication and readability.

## Map

- `packages/core` — pure domain logic: block ids, marks, chapter storage (Automerge), diffing.
- `apps/web/src/editor` — TipTap setup, block-id plugin, editor ↔ snapshot conversion.
- `apps/web/src/chapter` — the open chapter's session (batching edits into Automerge).
- `apps/web/src/theme` — design tokens (`tokens.css`) and global styles.
