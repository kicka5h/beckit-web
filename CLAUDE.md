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

## Look (on trial since 2026-10-04)

The writer is living with the current look for a while before deciding on it. Keep it as is;
don't restyle unless they ask, and ask before changing any of these choices:

- Native iOS/macOS feel: San Francisco for the interface (`-apple-system`, Figtree fallback),
  Literata for prose, Apple's dark system colors, 44px tap targets, translucent blurred bars.
- Gray accent (`#aeaeb2`) and gray fills (`#3a3a3c`), chosen over blue.
- Outline like Claude's sidebar: a line icon on every row (page, chapter, section, contents,
  project) and control (add, more, close, account), as SVG masks in `tokens.css`, never
  Unicode symbols (iOS turns those into emoji). Headings are quiet labels.
- Adding is a "+" beside each heading; where it offers more than one thing (the body's piece
  or section) it opens a menu, so look-alike actions never sit side by side.
- Not done yet, offered as options: a light mode, New York for prose.

## Map

- `packages/core` — pure domain logic: block ids, marks, chapter and manuscript docs (Automerge), diffing.
- `apps/web/src/editor` — TipTap setup, block-id plugin, editor ↔ snapshot conversion.
- `apps/web/src/chapter` — the open chapter's session (batching edits into Automerge).
- `apps/web/src/project` — opening the project and piece this device had open.
- `apps/web/src/sync` — the sync client (WebSocket to the server, library adoption, the badge's state).
- `apps/web/src/account` — sign-in: Firebase with Google, or a fixed development account.
- `server` — the sync server: automerge-repo over WebSockets; documents in Cloud Storage (Cloud
  Run) or a directory (self-hosted, `Dockerfile` + `compose.yaml` at the root, passphrase sign-in).
- `apps/web/src/device` — device storage (automerge-repo on IndexedDB), local settings, platform checks.
- `apps/web/src/facts` — the marquee's `facts.json`, refreshed every six months (`facts-refresh.yml`).
- `apps/web/e2e` — Playwright tests of the built app, offline included (`pnpm e2e`).
- `apps/web/src/theme` — design tokens (`tokens.css`) and global styles.
