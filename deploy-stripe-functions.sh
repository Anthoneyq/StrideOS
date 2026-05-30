#!/usr/bin/env bash
# STRIDE OS — deploy the Stripe billing Edge Functions to Supabase.
#
# WHY THIS EXISTS:
#   The "Upgrade to Pro" / "Get Team" buttons fail because these functions were
#   never deployed. The Supabase project is live (auth responds), but
#   https://uvjrflkzgulxwrlrqowp.supabase.co/functions/v1/create-checkout-session
#   returns {"code":"NOT_FOUND"}. This script deploys the functions and sets
#   the secrets they need.
#
# RUN FROM TERMINAL:
#   cd "/Users/anthoney/Documents/AnthoneyOS/09_Products/StrideOS"
#   bash deploy-stripe-functions.sh
#
# The price IDs below were VERIFIED LIVE against Stripe (acct_1NlGuoCGBxSHKYzS)
# on 2026-05-29 — all three prices already exist, are active, and match the
# app's pricing. Price IDs are publishable (not secret). Only the Stripe
# secret key + webhook secret are prompted.

set -e
PROJECT_REF="uvjrflkzgulxwrlrqowp"
APP_URL="https://strideos.thecoachlab.app"

# --- VERIFIED LIVE price IDs (Stripe API, 2026-05-29) ---
PRICE_MONTHLY="price_1TcTlICGBxSHKYzSIQ55cu0J"     # Coach Pro    $24/mo   (2400 usd)
PRICE_ANNUAL="price_1TcTudCGBxSHKYzSSTvLudjs"      # Coach Pro    $199/yr  (19900 usd)
PRICE_TEAM_ANNUAL="price_1TcTtQCGBxSHKYzSHYULj0XQ" # Program/Team $399/yr  (39900 usd)

echo "==> [1/5] Checking Supabase CLI..."
if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install it, then re-run this script:"
  echo "  brew install supabase/tap/supabase"
  exit 1
fi

echo "==> [2/5] Logging in (opens a browser if not already authenticated)..."
supabase login

echo "==> [3/5] Linking project $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

echo "==> [4/5] Setting secrets (secret key + webhook input hidden)..."
read -rsp "Stripe SECRET key (sk_live_...): " STRIPE_KEY; echo
read -rsp "Stripe WEBHOOK signing secret (whsec_...), or blank to skip: " WEBHOOK_SECRET; echo

case "$STRIPE_KEY" in sk_*) ;; *) echo "✗ Secret key should start with sk_. Aborting."; exit 1;; esac

supabase secrets set STRIPE_SECRET_KEY="$STRIPE_KEY"
supabase secrets set STRIPE_PRICE_MONTHLY="$PRICE_MONTHLY"
supabase secrets set STRIPE_PRICE_ANNUAL="$PRICE_ANNUAL"
supabase secrets set STRIPE_PRICE_TEAM_ANNUAL="$PRICE_TEAM_ANNUAL"
supabase secrets set APP_BASE_URL="$APP_URL"
if [ -n "$WEBHOOK_SECRET" ]; then
  supabase secrets set STRIPE_WEBHOOK_SECRET="$WEBHOOK_SECRET"
fi

echo "==> [5/5] Deploying functions..."
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt

echo ""
echo "✓ DONE. Reload the app, sign in, and click Upgrade to Pro (and Get Team)."
echo "  Verify it's live (should NOT say NOT_FOUND):"
echo "    curl -i -X OPTIONS https://$PROJECT_REF.supabase.co/functions/v1/create-checkout-session"
echo ""
echo "  If you set a webhook secret, point your Stripe webhook endpoint at:"
echo "    https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook"
echo "  (Stripe Dashboard → Developers → Webhooks → add endpoint; events:"
echo "   checkout.session.completed, customer.subscription.updated, customer.subscription.deleted)"
