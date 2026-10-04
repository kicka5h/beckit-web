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
| Sign-in              | Firebase Auth initialized; Sign in with Apple configured when its four values are set            |
| Budget               | `Beckit` budget alert at 50%, 90% and 100% of `BUDGET_AMOUNT` a month                            |
| CI configuration     | GitHub Actions secrets for the project, region, identity provider, deployer, bucket and web app  |

The Cloud Run sync service, the backup Cloud Run job and its Cloud Scheduler trigger arrive with
the server code in milestone 3, deployed by CI as `beckit-deploy`.

## Sign in with Apple

Beckit signs people in only through Apple and Google, so it never holds a password. Apple's side
needs a paid [Apple Developer](https://developer.apple.com/programs/) membership and three things
made once in its portal (Certificates, Identifiers & Profiles), none of which Apple lets a script
create:

1. **A Services ID** (Identifiers → Services IDs), for example `com.beckit.web`, with Sign in with
   Apple enabled. Its domain is `<project-id>.firebaseapp.com`, and its return URL is
   `https://<project-id>.firebaseapp.com/__/auth/handler`.
2. **A key** (Keys) with Sign in with Apple enabled. Download its `.p8` file once and note its key
   ID.
3. **Your team ID**, shown at the top right of the portal.

Then, in Cloud Shell with the `.p8` file uploaded:

```sh
APPLE_TEAM_ID=… APPLE_SERVICES_ID=com.beckit.web APPLE_KEY_ID=… APPLE_KEY_FILE=AuthKey_….p8 \
  ./infra/setup.sh
rm AuthKey_….p8
```

The key passes from the file to Firebase on stdin and is never printed. Without these values the
script skips Apple and says so.

## The one switch no API covers

Google sign-in needs an OAuth client, and Google only creates that when the provider is first
switched on in the Firebase console (Authentication → Sign-in method → Google). The script checks
for it at the end and says so if it is off. It stays on after that.
