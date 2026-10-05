#!/usr/bin/env bash
# Protects main on GitHub: every change arrives through a pull request whose CI "check" job
# passed, nobody (admins included) pushes to it directly, force-pushes or deletes it. Pull
# requests need no approving review, since one writer works here and can't approve their own.
# Safe to re-run: it sets the same rules each time.
#
#   ./infra/protect-main.sh
#   GITHUB_REPO=owner/repo ./infra/protect-main.sh
set -euo pipefail

GITHUB_REPO="${GITHUB_REPO:-kicka5h/beckit-web}"
BRANCH="${BRANCH:-main}"
# The CI job (.github/workflows/ci.yml) that must pass before a pull request can merge.
REQUIRED_CHECK="check"

printf '\n==> Branch protection for %s on %s\n' "$BRANCH" "$GITHUB_REPO"
jq -n --arg check "$REQUIRED_CHECK" '{
  required_status_checks: { strict: false, checks: [{ context: $check }] },
  enforce_admins: true,
  required_pull_request_reviews: { required_approving_review_count: 0 },
  restrictions: null,
  allow_force_pushes: false,
  allow_deletions: false
}' | gh api --method PUT "repos/${GITHUB_REPO}/branches/${BRANCH}/protection" --input - >/dev/null
echo "Protected: pull requests only, \"${REQUIRED_CHECK}\" must pass, no force-push or deletion."
