# Infrastructure

Beckit runs on Google Cloud project `789571395800`. `setup.sh` creates everything and wires it to
GitHub. It is safe to re-run, and secret values pass straight between tools without being
printed or written to disk.

## Run it

From [Cloud Shell](https://shell.cloud.google.com), signed in to Google as a project owner and
billing account admin, and to GitHub as a repository admin:

```sh
gh auth login
./infra/setup.sh
```

Override `PROJECT`, `REGION` (default `us-central1`), `GITHUB_REPO`, `BACKUP_REPO` (default
`<repo>-backup`) or `BUDGET_AMOUNT` (default `10USD`) with environment variables.

## What it creates

| Piece                | Resource                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Document storage     | Bucket `<project-id>-beckit-docs`, versioned, private                                            |
| Sync server images   | Artifact Registry Docker repository `beckit`                                                     |
| Sync server identity | `beckit-sync` service account, read/write on the bucket                                          |
| Backup job identity  | `beckit-backup` service account, read bucket and backup key                                      |
| Backup repository    | Private GitHub repository `<repo>-backup`                                                        |
| Backup key           | Deploy key with write access to the backup repository only, stored in secret `github-backup-key` |
| CI deploys           | `beckit-deploy` service account, reachable only from this repo through Workload Identity         |
| App hosting          | Firebase on the project, Hosting site `<project-id>`, web app `Beckit`                           |
| Sign-in              | Firebase Auth initialized                                                                        |
| Budget               | `Beckit` budget alert at 50%, 90% and 100% of `BUDGET_AMOUNT` a month                            |
| CI configuration     | GitHub Actions secrets for the project, region, identity provider, deployer, bucket and web app  |

The Cloud Run sync service, the backup Cloud Run job and its Cloud Scheduler trigger arrive with
the server code in milestone 3, deployed by CI as `beckit-deploy`.

## The one switch no API covers

Google sign-in needs an OAuth client, and Google only creates that when the provider is first
switched on in the Firebase console (Authentication → Sign-in method → Google). The script checks
for it at the end and says so if it is off. It stays on after that.
