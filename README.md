# Beckit

A writing app that opens from a URL, works on a plane, syncs across devices, and remembers every
version of every paragraph.

## Run it

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm check    # format, types, lint, duplicates, unit tests, API report, build
pnpm e2e      # offline tests in Chromium (Playwright)
pnpm bench    # 150k-word load benchmark
```

Requires Node 22+ and pnpm 10.

## Status

| Milestone                          | State   |
| ---------------------------------- | ------- |
| 1. Editor + permanent block ids    | Done    |
| 2. Offline writer (PWA, IndexedDB) | Done    |
| 3. Sync (Cloud Run, Cloud Storage) | Next    |
| 4. History core                    | Planned |
| 5. Review & revert                 | Planned |
| 6. Alternate takes + backup        | Planned |
| 7. Comments & notes                | Planned |

## Milestone 1 results

- Every top-level block carries a permanent ULID that survives typing, styling, paragraph ↔
  heading changes, splits, merges, undo/redo and cut-and-paste moves. Covered by editor and rule tests.
- Identity follows the bulk of the text: after a split, merge or paste, the block holding most
  of a paragraph's old text keeps its id. Enter at the start of a paragraph, or pasting above
  it, never orphans its history.
- Pasted copies always get new ids; cut-and-paste and drag are moves and keep theirs.
- Benchmark (laptop, Node 22): a 152,000-word book in 25 chapters is 0.33 MB on disk; one
  chapter loads in about 22 ms, all 25 in about 0.55 s.

## Milestone 2 results

- After one online visit the app opens and saves in airplane mode: a service worker precaches the
  whole build, and every manuscript and chapter lives in IndexedDB through automerge-repo. The
  exit check (write offline, close the tab, reopen, nothing lost) runs in CI with Playwright.
- A project is a free tree of sections and pieces in front matter, body and back matter, arranged
  by drag or by a row menu that works on phones. Five formats pre-make front and back matter as
  ordinary, editable pieces; contents pages are drawn from the tree.
- The header shows live word counts for the selection, the piece and the project (body only), a
  Dale–Chall reading level, and each form of a highlighted word with its count.
- A marquee of 22 sourced facts about books and publishing ships with the app; a GitHub Actions
  job opens a refresh task every six months.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the code values and [STYLE.md](STYLE.md) for how code is written.
