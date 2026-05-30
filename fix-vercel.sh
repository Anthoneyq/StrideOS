#!/usr/bin/env bash
# One-shot fix for the diverged Stride OS repo so Vercel deploys your latest index.html.
# Run this from Terminal:
#   cd "/Users/anthoney/Stride OS"
#   bash fix-vercel.sh
#
# What it does:
#   1. Cleans up the stuck rebase state from a previous attempt
#   2. Backs up your local index.html (the 234KB version you want live)
#   3. Pulls origin's 3 commits and replays your 1 commit on top
#   4. Resolves the inevitable index.html conflict by keeping YOUR version
#   5. Pushes to GitHub so Vercel auto-deploys
#
# Safe to re-run if anything goes wrong.

set -e
cd "/Users/anthoney/Stride OS"

echo "==> [1/6] Cleaning up stale rebase state from previous attempt..."
rm -f .git/index.lock
rm -rf .git/rebase-merge .git/rebase-apply
git rebase --abort 2>/dev/null || true

echo "==> [2/6] Backing up local index.html to /tmp/index-LOCAL-backup.html..."
cp index.html /tmp/index-LOCAL-backup.html
ls -la /tmp/index-LOCAL-backup.html

echo "==> [3/6] Fetching latest from GitHub..."
git fetch origin

echo "==> [3.5/6] Removing untracked files that are byte-identical to origin (safe — they come back as tracked after rebase)..."
# Each of these was verified to match origin/main:<path> exactly (same git hash-object SHA).
# Git refuses to overwrite untracked files during rebase, so we clear them first.
SAFE_TO_REMOVE=(
  "GITHUB_SETUP.md"
  "README.md"
  "SOURCES_LIBRARY.md"
  "SOURCES_LIBRARY_BACKUP_2026-05.md"
  "stride-os-repo/GITHUB_SETUP.md"
  "stride-os-repo/LICENSE"
  "stride-os-repo/README.md"
  "stride-os-repo/app/stride-os.html"
  "stride-os-repo/backend/README.md"
  "stride-os-repo/backend/migrations/001_init.sql"
  "stride-os-repo/backend/migrations/002_checkins.sql"
  "stride-os-repo/backend/migrations/003_corpus.sql"
  "stride-os-repo/backend/migrations/004_indices.sql"
  "stride-os-repo/backend/policies/rls.sql"
  "stride-os-repo/data/validation_corpus.csv"
  "stride-os-repo/docs/BACKEND_ARCHITECTURE.md"
  "stride-os-repo/docs/BRIDGE_MAP.md"
  "stride-os-repo/docs/MASTER_PLAN.md"
  "stride-os-repo/docs/NORTH_STAR.md"
  "stride-os-repo/docs/PRIVACY_POLICY.md"
  "stride-os-repo/docs/SOURCES_LIBRARY.md"
  "stride-os-repo/docs/SOURCES_LIBRARY_BACKUP_2026-05.md"
  "stride-os-repo/docs/TERMS_OF_SERVICE.md"
)
# Verify each one matches origin before removing — if any differs, abort loudly
for f in "${SAFE_TO_REMOVE[@]}"; do
  if [ -f "$f" ]; then
    LOCAL_SHA=$(git hash-object "$f")
    ORIGIN_SHA=$(git rev-parse "origin/main:$f" 2>/dev/null || echo "MISSING")
    if [ "$LOCAL_SHA" = "$ORIGIN_SHA" ]; then
      rm "$f"
      echo "    removed: $f (matched origin)"
    else
      echo "    SKIPPED $f — content differs from origin (local=$LOCAL_SHA origin=$ORIGIN_SHA)"
      echo "    Aborting — would need manual review."
      exit 1
    fi
  fi
done

echo "==> [4/6] Rebasing your local commit on top of origin/main..."
# This WILL conflict on index.html — we handle it below
if git rebase origin/main; then
  echo "    Rebase clean — no conflicts (unexpected, but fine)"
else
  echo "==> [5/6] Conflict on index.html as expected. Restoring YOUR version..."
  cp /tmp/index-LOCAL-backup.html index.html
  git add index.html
  GIT_EDITOR=true git rebase --continue
fi

echo "==> [6/6] Verifying state before push..."
git log --oneline -5
echo ""
echo "index.html size on this commit:"
git ls-tree -l HEAD index.html

echo ""
echo "==> Pushing to GitHub (Vercel will auto-deploy in ~60s)..."
git push origin main

echo ""
echo "DONE. Visit your Vercel URL in ~1 minute. Expected index.html size: 233941 bytes."
