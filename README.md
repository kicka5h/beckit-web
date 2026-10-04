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

## Self-hosting

Beckit runs anywhere Docker or Podman does, with no Google Cloud account: one container serves the
app and syncs it, keeping every document (with its full history) in a volume.

```sh
SYNC_PASSPHRASE='a long passphrase' docker compose up -d        # or: podman compose up -d
```

Open `http://localhost:8080`, open the outline, and sign in to sync with the passphrase; each
device enters it once. The offline app and Add to Home Screen need HTTPS, so to reach Beckit from
your other devices, point a domain at the machine and let the bundled Caddy fetch a certificate:

```sh
BECKIT_DOMAIN=beckit.example.com docker compose --profile https up -d
```

Back up the `beckit-data` volume; it is the server's copy of everything. Without compose:
`docker build -t beckit .` then
`docker run -p 8080:8080 -e SYNC_PASSPHRASE=… -v beckit-data:/data beckit`.

## Deploy

Every merge to `main` that passes CI is shipped by `.github/workflows/deploy.yml`: the sync
server to Cloud Run, then the app to Firebase Hosting at `https://<project-id>.web.app`, signed in
through Workload Identity Federation (no stored keys). `infra/setup.sh` creates everything it
needs.

To run sync locally: `pnpm --filter @beckit/server dev` starts a server with documents in memory
and the token `dev`; build the app with `VITE_SYNC_URL=http://localhost:8787 VITE_DEV_TOKEN=dev`.

## Status

| Milestone                          | State   |
| ---------------------------------- | ------- |
| 1. Editor + permanent block ids    | Done    |
| 2. Offline writer (PWA, IndexedDB) | Done    |
| 3. Sync (Cloud Run, Cloud Storage) | Started |
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
