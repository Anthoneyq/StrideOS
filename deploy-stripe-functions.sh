#!/usr/bin/env bash
# STRIDE OS — deploy the Stripe billing Edge Functions to Supabase.
#
# WHY THIS EXISTS:
#   The "Upgrade to Pro" flow depends on Supabase Edge Functions plus Stripe
#   secrets. Re-run this script after changing Stripe Price IDs, coupons,
#   webhook secrets, or billing function code.
#
# RUN FROM TERMINAL:
#   cd "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS"
#   bash deploy-stripe-functions.sh
#
# ⚠️ The launch price is $19.99/mo · $199/yr (stride-config.js). The current
# live Stripe catalog has a new $19.99 monthly price and the existing $199
# annual price. The founding offer is a coupon on annual. Price IDs are
# publishable; the Stripe secret key + webhook secret are prompted.

set -e
PROJECT_REF="njadrabgodqpzpbgkkbs"
APP_URL="https://strideos.thecoachlab.app"

# --- PRICE IDs — LAUNCH PRICE IS $19.99/mo · $199/yr (must match stride-config.js) ---
# Monthly + annual default to the live Stripe prices confirmed from the product
# catalog, but callers may override them via env. Each price is verified against
# Stripe (amount/interval/active/livemode) before any secret is written.
# If Stripe can't be reached to auto-verify, the operator must type the exact phrase
# 'DEPLOY 19.99/199' to override (no reflexive 'yes') — so
# this strongly prevents an accidental price mismatch, but the final safety still depends on
# the operator not overriding blindly. Team ($399/yr) is unchanged.
OLD_MONTHLY_ID="price_1TcTlICGBxSHKYzSIQ55cu0J"   # $24/mo  (retired)
PRICE_MONTHLY="${STRIPE_PRICE_MONTHLY:-price_1TnlJ7CGBxSHKYzSnAxpkPNv}" # Coach Pro — Monthly ($19.99)
PRICE_ANNUAL="${STRIPE_PRICE_ANNUAL:-price_1TcTudCGBxSHKYzSSTvLudjs}"    # Coach Pro — Annual ($199)
PRICE_TEAM_ANNUAL="${STRIPE_PRICE_TEAM_ANNUAL:-price_1TcTtQCGBxSHKYzSHYULj0XQ}" # Program/Team $399/yr (unchanged)
FOUNDING_COUPON="${STRIPE_FOUNDING_COUPON:-}"

if [ -z "$PRICE_MONTHLY" ] || [ -z "$PRICE_ANNUAL" ]; then
  echo "⛔ Refusing to deploy: launch price is \$19.99/mo · \$199/yr."
  echo "   Create or confirm the current Stripe Prices (\$19.99/mo = 1999, \$199/yr = 19900), then export:"
  echo "     export STRIPE_PRICE_MONTHLY=<new_id> STRIPE_PRICE_ANNUAL=<new_id>"
  echo "   and re-run; each price is then validated against Stripe (amount/interval/active) before deploy."
  exit 1
fi
if [ "$PRICE_MONTHLY" = "$OLD_MONTHLY_ID" ]; then
  echo "⛔ Refusing to deploy: STRIPE_PRICE_MONTHLY still points at the OLD \$24/mo Price."
  echo "   Use the confirmed \$19.99/mo Price ID: price_1TnlJ7CGBxSHKYzSnAxpkPNv"
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

echo "==> [3.5/5] Verifying the pause/freeze DB migration is applied remotely..."
# HARD PREREQUISITE: stripe-webhook now writes subscription_status='frozen',
# which the remote DB rejects until migration 20260818120000 (frozen status
# check constraint) is applied. Deploying freeze-capable functions against an
# unmigrated DB would strand a $1.99 customer with Pro access — refuse.
FREEZE_MIGRATION="20260818120000"
MIG_ROW=$(supabase migration list --linked 2>/dev/null | grep "$FREEZE_MIGRATION" || true)
migration_applied(){
  # Applied rows show the version under BOTH the Local and Remote columns.
  printf '%s' "$MIG_ROW" | grep -qE "$FREEZE_MIGRATION.*$FREEZE_MIGRATION"
}
if ! migration_applied; then
  echo "  ⚠ Migration $FREEZE_MIGRATION (frozen status) is NOT applied on the remote DB."
  read -rp "  Apply pending migrations now via 'supabase db push'? (yes/no) → " APPLY_MIG
  if [ "$APPLY_MIG" = "yes" ]; then
    supabase db push
    MIG_ROW=$(supabase migration list --linked 2>/dev/null | grep "$FREEZE_MIGRATION" || true)
  fi
  if ! migration_applied; then
    echo "⛔ Aborting: the functions in this deploy require migration $FREEZE_MIGRATION."
    echo "   Apply it ('supabase db push'), verify with 'supabase migration list --linked', then re-run."
    exit 1
  fi
fi
echo "  ✓ Migration $FREEZE_MIGRATION applied."

echo "==> [4/5] Setting secrets (secret key + webhook input hidden)..."
read -rsp "Stripe SECRET key (sk_live_...): " STRIPE_KEY; echo
read -rsp "Stripe WEBHOOK signing secret (whsec_...), or blank to skip: " WEBHOOK_SECRET; echo
read -rp "Stripe FOUNDING coupon ID (blank to leave founding checkout closed): " FOUNDING_COUPON_INPUT
[ -n "$FOUNDING_COUPON_INPUT" ] && FOUNDING_COUPON="$FOUNDING_COUPON_INPUT"

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
# --- Freeze price ($1.99/mo data-storage tier for the retention flow) ---
# The manage-subscription function NEVER creates prices at runtime; the freeze
# offer only turns on when a pre-created, validated price is deployed here.
# Resolution order: env STRIPE_PRICE_FREEZE → read-only lookup_key search.
# Not found / invalid → deploy proceeds with freeze DISABLED (pause + cancel
# keep working), with instructions to create it.
PRICE_FREEZE="${STRIPE_PRICE_FREEZE:-}"
if [ -z "$PRICE_FREEZE" ] && command -v curl >/dev/null 2>&1; then
  fr=$(curl -s -u "$STRIPE_KEY:" "https://api.stripe.com/v1/prices?lookup_keys[]=strideos_freeze_199&limit=1")
  PRICE_FREEZE=$(printf '%s' "$fr" | grep -oE '"id": *"price_[A-Za-z0-9]+"' | head -1 | sed -E 's/.*"(price_[A-Za-z0-9]+)"$/\1/')
  [ -n "$PRICE_FREEZE" ] && echo "  · Found freeze price by lookup_key strideos_freeze_199: $PRICE_FREEZE"
fi
FREEZE_OK=0
if [ -n "$PRICE_FREEZE" ]; then
  if validate_price "$PRICE_FREEZE" 199 month "Freeze \$1.99"; then FREEZE_OK=1; else
    echo "  ⛔ Freeze price failed validation — deploying with the freeze offer DISABLED."
    PRICE_FREEZE=""
  fi
else
  echo "  ⚠ No freeze price found. Freeze offer will be DISABLED (pause + cancel still work)."
  echo "    To enable: Stripe Dashboard → create recurring price \$1.99/mo USD,"
  echo "    lookup_key strideos_freeze_199 (product e.g. 'STRIDE OS · Frozen (data storage)'),"
  echo "    then re-run this script (or export STRIPE_PRICE_FREEZE=<id>)."
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
if [ "$FREEZE_OK" = "1" ]; then
  supabase secrets set STRIPE_PRICE_FREEZE="$PRICE_FREEZE"
else
  # Explicitly unset so a stale/invalid freeze price can never linger.
  supabase secrets unset STRIPE_PRICE_FREEZE >/dev/null 2>&1 || true
fi
supabase secrets set APP_BASE_URL="$APP_URL"
if [ -n "$FOUNDING_COUPON" ]; then
  supabase secrets set STRIPE_FOUNDING_COUPON="$FOUNDING_COUPON"
else
  echo "⚠ STRIPE_FOUNDING_COUPON not set; plan:\"founding\" will return 'Founding seats are not open right now'."
fi
if [ -n "$WEBHOOK_SECRET" ]; then
  supabase secrets set STRIPE_WEBHOOK_SECRET="$WEBHOOK_SECRET"
fi

echo "==> [5/5] Deploying functions..."
supabase functions deploy create-checkout-session --project-ref "$PROJECT_REF" --use-api
supabase functions deploy create-portal-session --project-ref "$PROJECT_REF" --use-api
supabase functions deploy manage-subscription --project-ref "$PROJECT_REF" --use-api
supabase functions deploy stripe-webhook --project-ref "$PROJECT_REF" --no-verify-jwt --use-api

echo ""
echo "✓ DONE. Reload the app, sign in, and click Upgrade to Pro."
echo "  Verify it's live (should return CORS headers, not NOT_FOUND):"
echo "    curl -i -X OPTIONS https://$PROJECT_REF.supabase.co/functions/v1/create-checkout-session"
echo ""
echo "  If you set a webhook secret, point your Stripe webhook endpoint at:"
echo "    https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook"
echo "  (Stripe Dashboard → Developers → Webhooks → add endpoint; events:"
echo "   checkout.session.completed, customer.subscription.updated, customer.subscription.deleted)"
