# Contributing to Beckit

Beckit's code is held to four values, in this order when they conflict:
**quality, readability, efficiency, and don't repeat yourself.**
Every rule below serves one of them, and most are enforced by `pnpm check`.

## The gate

```sh
pnpm check   # format, typecheck, lint, duplicate check, tests, build
```

Nothing merges unless `pnpm check` passes locally and in CI. Don't silence a rule to get
green; fix the code. A suppression needs a one-line comment saying why, and is a review topic.

## Quality

- **TypeScript strict, no escape hatches.** No `any`, no non-null `!`, no `as` casts except to
  brand a value right after validating it (see `isBlockId`).
- **Pure core, thin edges.** Logic lives in `packages/core` as pure functions over plain data,
  with unit tests. Editor, React and storage code adapts that logic and stays small.
- **Tests describe behaviour a writer would notice.** Name them as sentences
  ("Enter at the start: the text keeps its id"). Every bug fix starts with a failing test.
- **Never lose words.** Any change touching storage, sync or ids needs a test proving text and
  ids survive it.

## Readability

- Functions do one thing, fit on a screen, and nest at most three levels.
  Lint enforces: complexity ≤ 10, cognitive complexity ≤ 12, ≤ 60 lines, ≤ 4 parameters.
- Names over comments. Comments explain _why_, never _what_.
- Every exported function, type and class has a one-line doc comment saying what it's for.
- No nested ternaries. No clever one-liners that need a second read.
- Files are named for the one thing they hold (`chapter-session.ts`, `block-ids.ts`).

## Efficiency

- Do work proportional to what changed, not to the size of the manuscript. Reuse unchanged
  objects and compare by reference (see `snapshotsOf` and `diffEdit`).
- Write to Automerge only when a value differs, and batch keystrokes into one change per pause.
- Load one chapter at a time. Run `pnpm bench` after touching storage; the 150k-word book must
  open its current chapter in well under 100 ms on a laptop.
- Add a dependency only when it replaces meaningful code we would otherwise write and test.

## Don't repeat yourself

- **One source of truth per fact.** Block and mark types live in `packages/core/src/block.ts`.
  Editor node names map to them only in `apps/web/src/editor/schema.ts`. Colours, fonts and
  spacing live only in `apps/web/src/theme/tokens.css`; components never hard-code them.
- **Shared logic goes in core.** If web and server (or two components) need it, it moves to
  `packages/core` with tests, never copied.
- **Test helpers are shared too.** Use `newBlock` and `test-editor.ts` rather than building
  fixtures by hand.
- `jscpd` fails the build on any clone of 40+ tokens, tests included.

## Workflow

- Branch from `main`, one milestone task per pull request, small enough to review in one sitting.
- Commit messages: imperative summary line, then why.
- Every pull request gets a review pass focused only on duplication and readability before merge.
