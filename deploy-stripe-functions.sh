#!/usr/bin/env bash
# STRIDE OS — deploy the Stripe billing Edge Functions to Supabase.
#
# WHY THIS EXISTS:
#   The "Upgrade to Pro" / "Get Team" buttons fail because these functions were
#   never deployed. The Supabase project is live (auth responds), but
#   https://njadrabgodqpzpbgkkbs.supabase.co/functions/v1/create-checkout-session
#   returns {"code":"NOT_FOUND"}. This script deploys the functions and sets
#   the secrets they need.
#
# RUN FROM TERMINAL:
#   cd "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS"
#   bash deploy-stripe-functions.sh
#
# ⚠️ The launch price is $19.99/mo · $144/yr (stride-config.js). The monthly/annual
# Stripe Prices that exist today are the OLD $24/$199 ones — they must be re-created and
# their new IDs exported before deploy (this script now REQUIRES that; see below). Only
# the Team $399/yr price is unchanged. Price IDs are publishable; the Stripe secret key +
# webhook secret are prompted.

set -e
PROJECT_REF="njadrabgodqpzpbgkkbs"
APP_URL="https://strideos.thecoachlab.app"

# --- PRICE IDs — LAUNCH PRICE IS $19.99/mo · $144/yr (must match stride-config.js) ---
# Monthly + annual MUST be supplied via env (the new $19.99/$144 Stripe Prices). There is
# no fallback to the old prices, the known-old IDs are rejected outright, and each price is
# verified against Stripe (amount/interval/active/livemode) before any secret is written.
# If Stripe can't be reached to auto-verify, the operator must type the exact phrase
# 'DEPLOY 19.99/144' to override (no reflexive 'yes') — so
# this strongly prevents an accidental price mismatch, but the final safety still depends on
# the operator not overriding blindly. Team ($399/yr) is unchanged.
OLD_MONTHLY_ID="price_1TcTlICGBxSHKYzSIQ55cu0J"   # $24/mo  (retired)
OLD_ANNUAL_ID="price_1TcTudCGBxSHKYzSSTvLudjs"    # $199/yr (retired)
PRICE_MONTHLY="${STRIPE_PRICE_MONTHLY:-}"
PRICE_ANNUAL="${STRIPE_PRICE_ANNUAL:-}"
PRICE_TEAM_ANNUAL="${STRIPE_PRICE_TEAM_ANNUAL:-price_1TcTtQCGBxSHKYzSHYULj0XQ}" # Program/Team $399/yr (unchanged)

if [ -z "$PRICE_MONTHLY" ] || [ -z "$PRICE_ANNUAL" ]; then
  echo "⛔ Refusing to deploy: launch price is \$19.99/mo · \$144/yr."
  echo "   Create new Stripe Prices (\$19.99/mo = 1999, \$144/yr = 14400), then export:"
  echo "     export STRIPE_PRICE_MONTHLY=<new_id> STRIPE_PRICE_ANNUAL=<new_id>"
  echo "   and re-run; each price is then validated against Stripe (amount/interval/active) before deploy."
  exit 1
fi
if [ "$PRICE_MONTHLY" = "$OLD_MONTHLY_ID" ] || [ "$PRICE_ANNUAL" = "$OLD_ANNUAL_ID" ]; then
  echo "⛔ Refusing to deploy: STRIPE_PRICE_MONTHLY/ANNUAL still point at the OLD \$24/\$199 Prices."
  echo "   Those are retired. Create the \$19.99/\$144 Prices and export their new IDs."
  exit 1
fi

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

# Validate the supplied prices against Stripe (READ-ONLY) before writing any secret, so a
# wrong / test / typo price ID can never be deployed and charged. Uses the key just entered.
echo "==> Validating Stripe prices against the live account (read-only)..."
case "$STRIPE_KEY" in sk_live_*) EXPECT_LIVEMODE=true ;; *) EXPECT_LIVEMODE=false ;; esac
validate_price(){
  pid="$1"; want_amount="$2"; want_interval="$3"; label="$4"
  resp=$(curl -s -u "$STRIPE_KEY:" "https://api.stripe.com/v1/prices/$pid")
  if [ -z "$resp" ] || printf '%s' "$resp" | grep -q '"error"'; then
    echo "  ✗ $label ($pid): Stripe did not return this price."; return 1
  fi
  amount=$(printf '%s' "$resp"   | grep -oE '"unit_amount": *[0-9]+'    | head -1 | grep -oE '[0-9]+')
  currency=$(printf '%s' "$resp" | grep -oE '"currency": *"[a-z]+"'     | head -1 | sed -E 's/.*"([a-z]+)"$/\1/')
  interval=$(printf '%s' "$resp" | grep -oE '"interval": *"[a-z]+"'     | head -1 | sed -E 's/.*"([a-z]+)"$/\1/')
  active=$(printf '%s' "$resp"   | grep -oE '"active": *(true|false)'   | head -1 | grep -oE '(true|false)')
  livemode=$(printf '%s' "$resp" | grep -oE '"livemode": *(true|false)' | head -1 | grep -oE '(true|false)')
  ok=1
  [ "$amount" = "$want_amount" ]     || { echo "  ✗ $label unit_amount=$amount¢, expected $want_amount¢"; ok=0; }
  [ "$currency" = "usd" ]            || { echo "  ✗ $label currency=$currency, expected usd"; ok=0; }
  [ "$interval" = "$want_interval" ] || { echo "  ✗ $label interval=$interval, expected $want_interval"; ok=0; }
  [ "$active" = "true" ]             || { echo "  ✗ $label is not active"; ok=0; }
  [ "$livemode" = "$EXPECT_LIVEMODE" ] || { echo "  ✗ $label livemode=$livemode, expected $EXPECT_LIVEMODE for this key"; ok=0; }
  [ "$ok" = "1" ] && echo "  ✓ $label ($pid): ${amount}¢ / $interval, active, livemode=$livemode"
  [ "$ok" = "1" ]
}
PRICE_OK=1
if ! command -v curl >/dev/null 2>&1; then
  echo "  ⚠ curl not found — cannot auto-validate prices."; PRICE_OK=0
else
  validate_price "$PRICE_MONTHLY" 1999  month "Monthly \$19.99" || PRICE_OK=0
  validate_price "$PRICE_ANNUAL"  19900 year  "Annual \$199"    || PRICE_OK=0
fi
if [ "$PRICE_OK" != "1" ]; then
  echo "⚠ Prices were NOT auto-confirmed against Stripe (network down, or amounts mismatch)."
  echo "   Override only if you have personally verified these IDs are the live \$19.99 + \$199 prices."
  read -rp "   To override, type exactly: DEPLOY 19.99/199  → " CONFIRM
  [ "$CONFIRM" = "DEPLOY 19.99/199" ] || { echo "Aborted — fix the price IDs and re-run."; exit 1; }
fi

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
