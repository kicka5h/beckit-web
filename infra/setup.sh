#!/usr/bin/env bash
# Creates Beckit's Google Cloud foundation. Safe to re-run: each step skips what already exists.
#
#   ./infra/setup.sh                      # project 789571395800, region us-central1
#   PROJECT=my-project REGION=europe-west1 ./infra/setup.sh
#
# The Cloud Run sync service, backup job and its schedule are created by the deploy pipeline
# once server/ exists (milestone 3); this script prepares everything they run on.
set -euo pipefail

gh auth status --hostname github.com >/dev/null 2>&1 ||
  { echo "Sign in to GitHub first: gh auth login" >&2; exit 1; }

PROJECT="${PROJECT:-789571395800}"
REGION="${REGION:-us-central1}"
GITHUB_REPO="${GITHUB_REPO:-kicka5h/beckit-web}"

PROJECT_ID="$(gcloud projects describe "$PROJECT" --format='value(projectId)')"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
BUCKET="${PROJECT_ID}-beckit-docs"
REPOSITORY="beckit"
BACKUP_SECRET="github-backup-token"
SECRET_PLACEHOLDER="replace-me"
POOL="github"
SYNC_SA="beckit-sync@${PROJECT_ID}.iam.gserviceaccount.com"
BACKUP_SA="beckit-backup@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_SA="beckit-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID" >/dev/null

step() { printf '\n==> %s\n' "$1"; }

exists() { "$@" >/dev/null 2>&1; }

google_api() {
  local method="$1" url="$2" body="${3:-}"
  curl -fsS -X "$method" "$url" \
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
    identitytoolkit.googleapis.com
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
  # Only seed an empty secret, so a re-run never replaces the real token.
  [[ -n "$(gcloud secrets versions list "$BACKUP_SECRET" --limit=1 --format='value(name)')" ]] ||
    printf %s "$SECRET_PLACEHOLDER" | gcloud secrets versions add "$BACKUP_SECRET" --data-file=-
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
set_github_secrets
printf '\nDone. Manual steps left: see infra/README.md.\n'
