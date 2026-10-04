#!/usr/bin/env bash
# Creates Beckit's Google Cloud foundation and wires it to GitHub. Safe to re-run: each step
# skips what already exists. Secret values go straight from one tool to the other and are never
# printed or written to disk.
#
#   ./infra/setup.sh                      # project 789571395800, region us-central1
#   PROJECT=my-project REGION=europe-west1 BUDGET_AMOUNT=20USD ./infra/setup.sh
#
# The Cloud Run sync service, backup job and its schedule are created by the deploy pipeline
# once server/ exists (milestone 3); this script prepares everything they run on.
set -euo pipefail

gh auth status --hostname github.com >/dev/null 2>&1 ||
  { echo "Sign in to GitHub first: gh auth login" >&2; exit 1; }

PROJECT="${PROJECT:-789571395800}"
REGION="${REGION:-us-central1}"
GITHUB_REPO="${GITHUB_REPO:-kicka5h/beckit-web}"
BACKUP_REPO="${BACKUP_REPO:-${GITHUB_REPO}-backup}"
BUDGET_AMOUNT="${BUDGET_AMOUNT:-10USD}"

PROJECT_ID="$(gcloud projects describe "$PROJECT" --format='value(projectId)')"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
BUCKET="${PROJECT_ID}-beckit-docs"
REPOSITORY="beckit"
BACKUP_SECRET="github-backup-key"
LEGACY_BACKUP_SECRET="github-backup-token"
LEGACY_PLACEHOLDER="replace-me"
BACKUP_KEY_TITLE="beckit-nightly-backup"
WEB_APP_NAME="Beckit"
POOL="github"
SYNC_SA="beckit-sync@${PROJECT_ID}.iam.gserviceaccount.com"
BACKUP_SA="beckit-backup@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_SA="beckit-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID" >/dev/null

step() { printf '\n==> %s\n' "$1"; }

exists() { "$@" >/dev/null 2>&1; }

google_api() {
  local method="$1" url="$2" body="${3:-}"
  curl -sS --fail-with-body -X "$method" "$url" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "x-goog-user-project: ${PROJECT_ID}" \
    -H "Content-Type: application/json" \
    ${body:+-d "$body"}
}

enable_apis() {
  step "Enabling APIs"
  gcloud services enable \
    run.googleapis.com \
    storage.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudscheduler.googleapis.com \
    iam.googleapis.com \
    iamcredentials.googleapis.com \
    sts.googleapis.com \
    firebase.googleapis.com \
    firebasehosting.googleapis.com \
    identitytoolkit.googleapis.com \
    cloudbilling.googleapis.com \
    billingbudgets.googleapis.com
}

create_registry() {
  step "Artifact Registry repository ${REPOSITORY}"
  exists gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" ||
    gcloud artifacts repositories create "$REPOSITORY" \
      --repository-format=docker --location="$REGION" \
      --description="Beckit sync server and backup job images"
}

create_bucket() {
  step "Document bucket gs://${BUCKET}"
  exists gcloud storage buckets describe "gs://${BUCKET}" ||
    gcloud storage buckets create "gs://${BUCKET}" \
      --location="$REGION" --uniform-bucket-level-access --public-access-prevention
  gcloud storage buckets update "gs://${BUCKET}" --versioning
}

create_service_account() {
  local name="$1" display_name="$2"
  exists gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" ||
    gcloud iam service-accounts create "$name" --display-name="$display_name"
}

create_service_accounts() {
  step "Service accounts"
  create_service_account beckit-sync "Beckit sync server"
  create_service_account beckit-backup "Beckit nightly backup job"
  create_service_account beckit-deploy "Beckit GitHub Actions deployer"
}

create_backup_secret() {
  step "Secret ${BACKUP_SECRET}"
  exists gcloud secrets describe "$BACKUP_SECRET" ||
    gcloud secrets create "$BACKUP_SECRET" --replication-policy=automatic
}

grant_runtime_roles() {
  step "Runtime permissions"
  gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
    --member="serviceAccount:${SYNC_SA}" --role=roles/storage.objectUser >/dev/null
  gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
    --member="serviceAccount:${BACKUP_SA}" --role=roles/storage.objectViewer >/dev/null
  gcloud secrets add-iam-policy-binding "$BACKUP_SECRET" \
    --member="serviceAccount:${BACKUP_SA}" --role=roles/secretmanager.secretAccessor >/dev/null
}

grant_deploy_roles() {
  step "Deployer permissions"
  local role
  for role in roles/run.admin roles/cloudscheduler.admin roles/firebasehosting.admin; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:${DEPLOY_SA}" --role="$role" --condition=None >/dev/null
  done
  gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" --location="$REGION" \
    --member="serviceAccount:${DEPLOY_SA}" --role=roles/artifactregistry.writer >/dev/null
  local runtime_sa
  for runtime_sa in "$SYNC_SA" "$BACKUP_SA"; do
    gcloud iam service-accounts add-iam-policy-binding "$runtime_sa" \
      --member="serviceAccount:${DEPLOY_SA}" --role=roles/iam.serviceAccountUser >/dev/null
  done
}

create_github_federation() {
  step "Workload Identity Federation for ${GITHUB_REPO}"
  exists gcloud iam workload-identity-pools describe "$POOL" --location=global ||
    gcloud iam workload-identity-pools create "$POOL" --location=global \
      --display-name="GitHub Actions"
  exists gcloud iam workload-identity-pools providers describe "$POOL" \
    --workload-identity-pool="$POOL" --location=global ||
    gcloud iam workload-identity-pools providers create-oidc "$POOL" \
      --workload-identity-pool="$POOL" --location=global \
      --issuer-uri="https://token.actions.githubusercontent.com" \
      --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
      --attribute-condition="assertion.repository == '${GITHUB_REPO}'"
  gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" \
    --role=roles/iam.workloadIdentityUser \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${GITHUB_REPO}" \
    >/dev/null
}

add_firebase() {
  step "Firebase (Hosting and Auth)"
  exists google_api GET "https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}" ||
    google_api POST "https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}:addFirebase" '{}'
  exists google_api GET "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config" ||
    google_api POST \
      "https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/identityPlatform:initializeAuth" '{}'
}

create_hosting_site() {
  step "Firebase Hosting site ${PROJECT_ID}"
  local sites="https://firebasehosting.googleapis.com/v1beta1/projects/${PROJECT_ID}/sites"
  exists google_api GET "${sites}/${PROJECT_ID}" ||
    google_api POST "${sites}?siteId=${PROJECT_ID}" '{}' >/dev/null
}

# Waits for a Firebase long-running operation and prints its result.
wait_for_operation() {
  local operation="$1" result
  while true; do
    result="$(google_api GET "https://firebase.googleapis.com/v1beta1/${operation}")"
    [[ "$(jq -r '.done // false' <<<"$result")" == true ]] && break
    sleep 2
  done
  jq -e '.error | not' <<<"$result" >/dev/null || { jq '.error' <<<"$result" >&2; exit 1; }
  jq -c '.response' <<<"$result"
}

web_app_id() {
  google_api GET "https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps" |
    jq -r --arg name "$WEB_APP_NAME" '[.apps[]? | select(.displayName == $name)][0].appId // empty'
}

create_web_app() {
  step "Firebase web app ${WEB_APP_NAME}"
  local app_id operation
  app_id="$(web_app_id)"
  if [[ -z "$app_id" ]]; then
    operation="$(google_api POST "https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps" \
      "{\"displayName\": \"${WEB_APP_NAME}\"}" | jq -r '.name')"
    app_id="$(wait_for_operation "$operation" | jq -r '.appId')"
  fi
  google_api GET "https://firebase.googleapis.com/v1beta1/projects/-/webApps/${app_id}/config" |
    jq -c . | gh secret set FIREBASE_WEB_CONFIG --repo "$GITHUB_REPO"
}

# Google offers no API for creating the OAuth client the Google provider needs: Firebase makes one
# the first time the provider is switched on in its console. So this step checks, and says where.
check_google_sign_in() {
  step "Google sign-in"
  local config
  config="$(google_api GET \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs/google.com" \
    2>/dev/null || true)"
  if [[ "$(jq -r '.enabled // false' <<<"${config:-null}")" == true ]]; then
    echo "Enabled."
  else
    echo "Not enabled. One-time switch, no API exists for it: Firebase console → Authentication →" \
      "Sign-in method → Google → Enable, then re-run this script." >&2
  fi
}

create_backup_repo() {
  step "Backup repository ${BACKUP_REPO}"
  exists gh repo view "$BACKUP_REPO" ||
    gh repo create "$BACKUP_REPO" --private --description "Nightly Markdown snapshots from Beckit"
}

# Whether the backup secret already holds a key, so a re-run never replaces a working one.
has_backup_key() {
  [[ -n "$(gcloud secrets versions list "$BACKUP_SECRET" --filter=state=enabled --limit=1 \
    --format='value(name)')" ]]
}

remove_backup_deploy_keys() {
  local key_id
  for key_id in $(gh repo deploy-key list --repo "$BACKUP_REPO" --json id,title \
    --jq ".[] | select(.title == \"${BACKUP_KEY_TITLE}\") | .id"); do
    gh repo deploy-key delete "$key_id" --repo "$BACKUP_REPO"
  done
}

# Runs in a subshell so the key directory is removed however it exits.
store_new_backup_key() (
  key_dir="$(mktemp -d -p /dev/shm 2>/dev/null || mktemp -d)"
  trap 'rm -rf "$key_dir"' EXIT
  ssh-keygen -q -t ed25519 -N "" -C "$BACKUP_KEY_TITLE" -f "${key_dir}/key"
  remove_backup_deploy_keys
  gh repo deploy-key add "${key_dir}/key.pub" --repo "$BACKUP_REPO" \
    --title "$BACKUP_KEY_TITLE" --allow-write
  gcloud secrets versions add "$BACKUP_SECRET" --data-file="${key_dir}/key" >/dev/null
)

# The backup job pushes with a deploy key: it can write to the backup repository and nothing else,
# and unlike a personal token it can be created from a script.
create_backup_key() {
  step "Backup deploy key"
  if has_backup_key; then
    echo "Already stored in ${BACKUP_SECRET}."
  else
    store_new_backup_key
  fi
}

# Earlier runs made a token secret holding a placeholder; the deploy key replaces it.
remove_legacy_backup_secret() {
  exists gcloud secrets describe "$LEGACY_BACKUP_SECRET" || return 0
  local value
  value="$(gcloud secrets versions access latest --secret="$LEGACY_BACKUP_SECRET" 2>/dev/null || true)"
  [[ "$value" == "$LEGACY_PLACEHOLDER" ]] && gcloud secrets delete "$LEGACY_BACKUP_SECRET" --quiet
  return 0
}

create_budget() {
  step "Budget alert (${BUDGET_AMOUNT} a month)"
  local account
  account="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingAccountName)')"
  account="${account#billingAccounts/}"
  [[ -n "$account" ]] || { echo "No billing account linked to ${PROJECT_ID}." >&2; exit 1; }
  [[ -z "$(gcloud billing budgets list --billing-account="$account" --billing-project="$PROJECT_ID" \
    --filter="displayName=Beckit" --format='value(name)')" ]] || return 0
  gcloud billing budgets create --billing-account="$account" --billing-project="$PROJECT_ID" \
    --display-name=Beckit --budget-amount="$BUDGET_AMOUNT" \
    --filter-projects="projects/${PROJECT_ID}" \
    --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0
}

set_github_secret() {
  printf %s "$2" | gh secret set "$1" --repo "$GITHUB_REPO"
}

set_github_secrets() {
  step "GitHub Actions secrets on ${GITHUB_REPO}"
  set_github_secret GCP_PROJECT_ID "$PROJECT_ID"
  set_github_secret GCP_REGION "$REGION"
  set_github_secret GCP_WORKLOAD_IDENTITY_PROVIDER \
    "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${POOL}"
  set_github_secret GCP_DEPLOY_SERVICE_ACCOUNT "$DEPLOY_SA"
  set_github_secret BECKIT_BUCKET "$BUCKET"
}

enable_apis
create_registry
create_bucket
create_service_accounts
create_backup_secret
grant_runtime_roles
grant_deploy_roles
create_github_federation
add_firebase
create_hosting_site
create_web_app
create_backup_repo
create_backup_key
remove_legacy_backup_secret
create_budget
set_github_secrets
check_google_sign_in
printf '\nDone.\n'
