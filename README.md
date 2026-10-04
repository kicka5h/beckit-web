# Beckit

A writing app that opens from a URL, works on a plane, syncs across devices, and remembers every
version of every paragraph.

## Run it

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm check    # everything CI runs
pnpm bench    # 150k-word load benchmark
```

Requires Node 22+ and pnpm 10.

## Status

| Milestone                          | State   |
| ---------------------------------- | ------- |
| 1. Editor + permanent block ids    | Done    |
| 2. Offline writer (PWA, IndexedDB) | Next    |
| 3. Sync (Cloud Run, Cloud Storage) | Planned |
| 4. History core                    | Planned |
| 5. Review & revert                 | Planned |
| 6. Alternate takes + backup        | Planned |
| 7. Comments & notes                | Planned |

## Milestone 1 results

- Every top-level block carries a permanent ULID that survives typing, styling, paragraph ↔
  heading changes, splits, merges, undo/redo and cut-and-paste moves. 36 editor tests and 13 rule tests cover it.
- Identity follows the bulk of the text: after a split, merge or paste, the block holding most
  of a paragraph's old text keeps its id. Enter at the start of a paragraph, or pasting above
  it, never orphans its history.
- Pasted copies always get new ids; cut-and-paste and drag are moves and keep theirs.
- Benchmark (laptop, Node 22): a 152,000-word book in 25 chapters is 0.33 MB on disk; one
  chapter loads in about 22 ms, all 25 in about 0.55 s.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the code standards.
