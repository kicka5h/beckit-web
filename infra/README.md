# Infrastructure

Beckit runs on Google Cloud project `789571395800`. `setup.sh` creates the foundation and is
safe to re-run.

## Run it

From [Cloud Shell](https://shell.cloud.google.com) or any machine signed in with
`gcloud auth login` as a project owner:

```sh
./infra/setup.sh
```

Override `PROJECT`, `REGION` (default `us-central1`) or `GITHUB_REPO` with environment variables.

## What it creates

| Piece                | Resource                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Document storage     | Bucket `<project-id>-beckit-docs`, versioned, private                                               |
| Sync server images   | Artifact Registry Docker repository `beckit`                                                        |
| Backup GitHub token  | Secret Manager secret `github-backup-token` (empty)                                                 |
| Sync server identity | `beckit-sync` service account, read/write on the bucket                                             |
| Backup job identity  | `beckit-backup` service account, read bucket and token                                              |
| CI deploys           | `beckit-deploy` service account, reachable only from this repo through Workload Identity Federation |
| App hosting, sign-in | Firebase added to the project, Firebase Auth initialized                                            |

The Cloud Run sync service, the backup Cloud Run job and its Cloud Scheduler trigger arrive with
the server code in milestone 3, deployed by CI as `beckit-deploy`.

## Manual steps

1. **Google sign-in**: Firebase console → Authentication → Sign-in method → enable Google.
2. **Web app config**: Firebase console → Project settings → Add app → Web. The app reads that
   config when sync lands.
3. **Backup token**: create a fine-grained GitHub token with contents write on the backup
   repository, then
   `printf %s "$TOKEN" | gcloud secrets versions add github-backup-token --data-file=-`.
4. **CI variables**: copy the values `setup.sh` prints into GitHub → Settings → Secrets and
   variables → Actions → Variables.
5. **Budget alert**: Billing → Budgets & alerts, a few dollars a month is the expected spend.
