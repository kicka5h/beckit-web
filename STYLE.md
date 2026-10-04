# Beckit style guide

Every file should read as if one careful person wrote it. Where a choice is arbitrary, we make it
once, here, and apply it everywhere. Lint enforces each rule marked **(lint)**; the rest are
checked in review.

## Philosophy

- **Code is read far more than it is written.** Optimize for the next reader, who knows
  TypeScript but not this file.
- **One way to do each thing.** Two equivalent spellings in one codebase make readers wonder
  what the difference is. There is none, so there is only one.
- **Names carry meaning; comments carry reasons.** If a comment explains _what_ code does, rename
  or split the code instead.
- **American English** in code, comments and docs (color, behavior, organize).
- **Core is consumed, not edited.** `packages/core` is the foundation everything else stands on.
  Changing it is a deliberate, reviewed act (see [Core is a protected layer](#core-is-a-protected-layer)).

## Files

- Modules are `kebab-case.ts`; React components are `PascalCase.tsx`, one component per file. **(lint)**
- One concept per file, named for that concept (`chapter-session.ts`, `block-ids.ts`).
- Tests sit beside their source as `name.test.ts`.
- **A file reads top to bottom**: imports, types, literal constants (exported or not), then
  functions, each defined before anything that uses it, whether exported or not. A value built
  from a function (a memoized lookup) sits right after that function.
- A file-level note is a `//` comment block above the imports; `/** */` is only for documenting a
  declaration.

## Casing

| Kind                                                    | Case         | Example                           |
| ------------------------------------------------------- | ------------ | --------------------------------- |
| Variables, parameters, functions, properties, methods   | `camelCase`  | `readChapter`, `blockId`          |
| Types, interfaces, classes, React components            | `PascalCase` | `BlockSnapshot`, `ChapterSession` |
| Module-level constants holding a literal value or table | `UPPER_CASE` | `MARK_TYPES`, `ULID_PATTERN`      |

`UPPER_CASE` is only for values written out literally in the source (a string, number, regex, or
an `as const` list or table). Anything built at runtime (a cache, a factory, a `Map`) is
`camelCase`, even at module level. **(lint: casing; review: literal-only)**

## Naming

- **Whole words.** `block`, `index`, `position`, never `b`, `i`, `p`. **(lint: no one-letter names
  except `a`/`b` in comparators)**
- **Allowed abbreviations**, because the libraries we use say them: `id`, `doc` (a document),
  `pos` (a ProseMirror position), `tr` (a ProseMirror transaction), `ulid`, `json`, `html`, `dom`.
  Units are spelled out: `delayMilliseconds`, not `delayMs`.
- **Functions start with a verb** (`readChapter`, `applyEdit`, `settleIds`), with three
  conventional shapes:
  - `createX` makes a new thing (`createBlock`, `createChapter`).
  - `toX` converts one representation into another (`toSnapshot`, `toDocJson`, `toSegments`).
  - `xOf` is a pure lookup that reads something off its argument (`blockIdOf`, `levelOf`).
- Variables and properties are named for what they hold, matching the type's own name:
  a `Chapter` is `chapter`, a `ChapterDoc` or ProseMirror document is `doc`.
- **Memoized lookups** follow the `xOf` shape (`snapshotOf`, `wordCountOf`).
- **Booleans start with `is`, `has`, `should` or `can`** (`isBlockId`, `isSameOrder`). **(lint)**
- **Props interfaces** are the component name plus `Props` (`HeaderProps`).
- **Type parameters are words too**: `Item`, `Key`, `Value`, `Result`, never `T`.
- **Import aliases spell out the library**: `Node as ProseMirrorNode`, not `Node as PMNode`.

## Values and variables

- `const` by default. `let` only for a value that is reassigned (an accumulator or a lazily
  built cache). Never `var`. One declaration per statement. **(lint)**
- Declare a variable where it is first used, initialized in the same statement.
- Empty collections are written as literals with their type on the declaration:
  `const blocks: BlockSnapshot[] = [];`, `const ids = new Set<BlockId>();`
- **Absence is `undefined`, never `null`.** A function that may find nothing returns
  `T | undefined`. `null` appears only where a library demands it, with a comment. **(lint)**
- A value that is always passed but may be missing is typed `T | undefined`. A parameter or
  field that callers may leave out is optional (`?`). Never write `= undefined`. **(lint)**
- When a function reads two or more properties of a plain data object (a record, span or
  snapshot) and doesn't use the object itself, it destructures them, in the parameter list or
  where the object is first read. Not destructured: class instances (ProseMirror nodes, slices,
  states, mappings), union types that would lose their narrowing, and properties whose names
  would clash with a local variable.
- Exported collections are `readonly` (`readonly string[]`, `as const`).

## Functions

- **Named functions are `function` declarations**, exported or not. **(lint)**
- **Arrow functions are only for inline callbacks**: arguments to `map`, `filter`, event
  handlers, a returned closure, and class fields that must keep `this` (`subscribe`).
- Every named function declares its return type. **(lint)**
- Parameters that receive arrays or objects the function must not change are `readonly`.
- At most 4 parameters; past that, take one options object. **(lint)**

## Loops

- **`for…of` for side effects; `map` / `filter` / `flatMap` / `reduce` to build a new value.**
  Never `forEach`. **(lint for arrays; review for library types)**
- Need the index too? `for (const [index, item] of items.entries())`.
- Repeating something a number of times: `for (let count = 0; count < total; count++)`.
- Sorting or reversing never mutates: `toSorted`, `toReversed`. Strings compare with
  `localeCompare`; numbers with subtraction; spans with `compareByStart`.
- ProseMirror only offers callbacks for walking children; use `childrenOf` instead of calling
  its `forEach` directly.

## Types

- `interface` for object shapes; `type` for unions, aliases and mapped types. **(lint)**
  Exception: Automerge root documents must be `type` (it needs a plain record).
- Fields of data types and component props are `readonly`. Automerge documents are the
  exception: they are mutated inside `Automerge.change`.
- Ranges are always `{ start, end }`, end exclusive, using the shared `Span` type.
- Brand primitive identifiers (`BlockId`) and create them only through a validating function.

## Comments

- **Every export and every React component** has a `/** … */` doc comment. **(lint)** Any doc
  comment, exported or not, follows the same shape. Its first sentence says what the thing is
  for, in present tense, and its shape follows the name:
  - a function or method starts with a third-person verb: "Creates…", "Reads…", "Counts…";
  - a predicate starts with "Whether…";
  - an `xOf` lookup, component, class, constant or type starts with a noun phrase:
    "The level of…", "The faint bar above the page…", "A range…".

  Further sentences, if any, explain _why_ or a non-obvious consequence.

- Private functions get a doc comment only when their name can't say everything.
- Inline `//` comments only explain a non-obvious _why_: a library quirk, a performance reason,
  a rule from the design doc. Never narrate _what_ the next line does.
- No commented-out code. A to-do names its milestone: `// TODO(m2): persist to IndexedDB`.
- A lint suppression always says why on the same line: `// eslint-disable-next-line rule -- reason`.

## Imports

- Order: external packages, then `@beckit/*`, then relative paths, then side-effect imports
  (CSS), each group alphabetical and separated by a blank line. **(lint)**
- `import type` for anything used only as a type. **(lint)**
- Relative imports include the `.ts` / `.tsx` extension.
- Namespace imports use the library's full name: `import * as Automerge from "@automerge/automerge"`.

## Classes

- Only for stateful objects with a lifecycle (`ChapterSession`). Everything else is functions.
- Private state uses `#fields`. Order: fields, constructor, getters, public methods (an arrow-field
  method such as `subscribe` counts as a public method), private methods.

## React

- Function components only, one per file, props interface beside it.
- State that lives outside React (a session, a store) is read with `useSyncExternalStore`.

## CSS

- Every color, font, size and spacing value is a token in `tokens.css`; stylesheets only read
  tokens. The exceptions are geometry (`50%` for a circle) and the one media-query breakpoint,
  which lives in `tokens.css` because media queries can't read variables.
- Token names put the subject first, then the property: `--prose-size`, `--ui-font`,
  `--page-color`, `--header-inset`. Scales are the scale's name and a step: `--space-1` … `--space-5`.
- Class names are BEM: `.block`, `.block__part`, `.block--variant` (`.header__status`).
- Responsive changes override tokens; components don't carry their own media queries.

## Errors

- Throw `Error` with a message only for programmer errors (a missing DOM root, an impossible
  state). Never swallow an error silently.

## Tests

- The outer `describe` names the unit under test exactly as exported (`resolveBlockIds`,
  `ChapterSession`, `BlockIds`). Nested `describe`s name a situation: "when splitting".
- `it` states a behavior as a plain sentence, without a "label:" prefix or numbering
  ("leaves the id with the text when Enter is pressed at the start").
- Build fixtures with shared helpers (`createBlock`, `createTestEditor`, `placeCaret`), never by
  hand. Helpers take the thing they act on as their first argument.
- Table-driven cases are a typed `const cases` declared inside the `describe`, just above `it.each`.
- Fixture literals are typed on the declaration (`const segments: Segment[] = …`), not with
  `as const` on each value.
- Every editor a test creates is destroyed in `afterEach` / `afterAll`.
- Tests may brand a literal fixture id with `as BlockId`; production code may not.

## Libraries

We use well-supported, widely adopted libraries, and as few as we can.

| Library                                                                | Purpose                               |
| ---------------------------------------------------------------------- | ------------------------------------- |
| TypeScript                                                             | Language                              |
| React                                                                  | UI                                    |
| TipTap (ProseMirror)                                                   | Rich-text editor                      |
| Automerge                                                              | Local-first storage, sync and history |
| automerge-repo, its IndexedDB storage adapter                          | Documents stored on the device        |
| automerge-repo WebSocket adapter (with isomorphic-ws, which it types)  | Sync between devices and the server   |
| Firebase JS SDK (Auth)                                                 | Google sign-in in the app             |
| firebase-admin, @google-cloud/storage                                  | Sync server: tokens, document storage |
| vite-plugin-pwa (Workbox, workbox-window)                              | Service worker: offline, updates      |
| ulid                                                                   | Sortable unique block ids             |
| Fontsource (Literata, Figtree)                                         | Self-hosted fonts that work offline   |
| Vite                                                                   | Dev server and build                  |
| Vitest, happy-dom, @vitest/coverage-v8                                 | Tests and coverage                    |
| Playwright                                                             | Offline tests in a real browser       |
| ESLint, typescript-eslint, sonarjs, unicorn, jsdoc, simple-import-sort | Lint                                  |
| Prettier                                                               | Formatting                            |
| jscpd                                                                  | Duplicate-code detection              |
| API Extractor                                                          | Core public-API report                |

A new dependency must be: actively maintained (releases within the last year, more than one
maintainer or an organization behind it), typed, widely used, and replacing code we would
otherwise write and test ourselves. Propose it in the pull request description and add it here.

## Core is a protected layer

`packages/core` is the domain: block identity, storage format, diffing. Apps consume it; they
don't reach into it.

- **The public API is listed name by name** in `packages/core/src/index.ts`. Nothing else is
  importable from `@beckit/core`.
- **The API is recorded** in `packages/core/api/core.api.md`. CI fails if the public API changes
  and the report wasn't updated. Updating it (`pnpm api:update`) is a deliberate act, called out
  in the pull request.
- **Every core change is reviewed by the owner** (`CODEOWNERS`).
- **Core has 100% test coverage** (lines, branches, functions, statements). **(CI)**
- Prefer adding a new function to changing an existing one's behavior. Any change to stored data
  shape needs a migration plan in the pull request.
