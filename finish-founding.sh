#!/usr/bin/env bash
# STRIDE OS — one-shot: create the live Founding Coach coupon and store it so
# founding checkout opens. Idempotent: reuses an existing valid "Founding Coach"
# live coupon instead of creating a duplicate.
#
# RUN (Anthoney): bash "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS/finish-founding.sh"
#
# Spec (PRICING_STRATEGY.md §0/§8): $199 → $149/yr = $50 off, duration=forever
# (discount recurs every year while the subscription stays active),
# max_redemptions=25 (Stripe enforces the 25-seat cap).
set -euo pipefail
cd "$(dirname "$0")"

existing=$(stripe coupons list --live 2>/dev/null | python3 -c '
import json,sys
d = json.load(sys.stdin)
print(next((c["id"] for c in d.get("data",[])
            if c.get("name")=="Founding Coach" and c.get("valid")), ""))' || true)

if [ -n "$existing" ]; then
  COUPON="$existing"
  echo "Reusing existing live coupon: $COUPON"
else
  COUPON=$(stripe coupons create --live \
    -d amount_off=5000 -d currency=usd -d duration=forever \
    -d max_redemptions=25 -d "name=Founding Coach" \
    | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
  echo "Created live coupon: $COUPON"
fi

echo "Storing as STRIPE_FOUNDING_COUPON on Supabase project njadrabgodqpzpbgkkbs..."
supabase secrets set STRIPE_FOUNDING_COUPON="$COUPON" --project-ref njadrabgodqpzpbgkkbs
supabase secrets list --project-ref njadrabgodqpzpbgkkbs | grep -i FOUNDING
echo "✓ Done. Founding checkout ('Claim a founding seat') opens on the next"
echo "  function invocation (~1 min). Cap of 25 is enforced by Stripe."
