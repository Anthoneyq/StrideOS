#!/usr/bin/env bash
# STRIDE OS deploy preflight.
# Safe to run from this repository. It does not delete files, rebase, or push.

set -euo pipefail

cd "$(dirname "$0")"

echo "==> Repository"
pwd
git status -sb

echo ""
echo "==> Prediction benchmark"
node Predictive_Model/prediction_benchmarks.js

echo ""
echo "==> Inline script syntax"
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const scripts=[...html.matchAll(/<script[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m=>m[1]).filter(s=>s.trim() && !s.includes('supabase-js') && !s.includes('papaparse') && !s.includes('xlsx.full.min')); scripts.forEach(s=>new Function(s)); console.log('inline script syntax ok:', scripts.length);"

echo ""
echo "==> Supabase project health"
if command -v curl >/dev/null 2>&1; then
  curl -I --max-time 15 "https://njadrabgodqpzpbgkkbs.supabase.co/auth/v1/settings" || true
else
  echo "curl not found; skip"
fi

echo ""
echo "Next deploy steps:"
echo "1. Apply Supabase migrations/config after confirming the project ref resolves:"
echo "   supabase link --project-ref njadrabgodqpzpbgkkbs"
echo "   supabase db push"
echo "   supabase config push"
echo "   supabase functions deploy stripe-webhook --no-verify-jwt"
echo "   supabase functions deploy create-checkout-session create-portal-session strava-oauth-callback strava-sync-activities"
echo "2. Commit and push the reviewed changes to main so Vercel redeploys."
echo "3. Verify https://strideos.thecoachlab.app and https://stride-os-gray.vercel.app serve the new index.html."
