# Contributing to Beckit

Beckit's code is held to four values, in this order when they conflict:
**quality, readability, efficiency, and don't repeat yourself.**
This file says what each value demands. [STYLE.md](STYLE.md) says how the code is written:
casing, naming, functions, comments, libraries, and the rules that protect `packages/core`.

## The gate

```sh
pnpm check   # format, typecheck, lint, duplicates, tests + core coverage, core API report, build
```

Nothing merges unless `pnpm check` passes locally and in CI. Don't silence a rule to get
green; fix the code. A suppression needs a reason on the same line and is a review topic.

## Quality

- **TypeScript strict, no escape hatches.** No `any`, no non-null `!`, no `as` casts except to
  brand a value right after validating it (see `isBlockId`). Tests may brand literal fixtures.
- **Pure core, thin edges.** Logic lives in `packages/core` as pure functions over plain data,
  with unit tests. Editor, React and storage code adapts that logic and stays small.
- **Every bug fix starts with a failing test.**
- **Never lose words.** Any change touching storage, sync or ids needs a test proving text and
  ids survive it.

## Readability

- Functions do one thing, fit on a screen, and nest at most three levels.
  Lint enforces: complexity ≤ 10, cognitive complexity ≤ 12, ≤ 60 lines, ≤ 4 parameters.
- No nested ternaries. No clever one-liners that need a second read.
- Follow [STYLE.md](STYLE.md) exactly, so every file reads the same way.

## Efficiency

- Do work proportional to what changed, not to the size of the manuscript. Reuse unchanged
  objects and compare by reference (see `toSnapshots` and `diffEdit`).
- Write to Automerge only when a value differs, and batch keystrokes into one change per pause.
- Load one chapter at a time. Run `pnpm bench` after touching storage; the 150k-word book must
  open its current chapter in well under 100 ms on a laptop.

## Don't repeat yourself

- **One source of truth per fact.** Block and mark types live in `packages/core/src/block.ts`.
  Editor node names map to them only in `apps/web/src/editor/schema.ts`. Colors, fonts and
  spacing live only in `apps/web/src/theme/tokens.css`; components never hard-code them.
- **Shared logic goes in core.** If web and server (or two components) need it, it moves to
  `packages/core` with tests, never copied.
- **Repeated patterns get one helper**: `memoize` for per-object caches, `childrenOf` for walking
  editor nodes, `createBlock` and `test-editor.ts` for test fixtures.
- `jscpd` fails the build on any clone of 40+ tokens, tests included.

## Workflow

- Branch from `main`, one milestone task per pull request, small enough to review in one sitting.
- Commit messages: imperative summary line, then why.
- Every pull request gets a review pass focused only on duplication and readability before merge.
- A pull request that changes `packages/core/api/core.api.md` says why in its description.
