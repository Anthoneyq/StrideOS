#!/usr/bin/env bash
# STRIDE OS — one-shot: create the live Founding Coach coupon and store it so
# founding checkout opens.
#
# RUN (Anthoney): bash "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS/finish-founding.sh"
#
# Spec (PRICING_STRATEGY.md §0/§8): $199 → $149/yr = $50 off, duration=forever
# (discount recurs every year while the subscription stays active),
# max_redemptions=25 (Stripe enforces the 25-seat cap).
#
# Safety model:
#   - Fail closed: any listing/parse failure aborts BEFORE any write. An
#     inspection failure is never treated as "coupon absent".
#   - Reuse only after verifying EVERY spec field on the existing coupon;
#     names are not unique in Stripe, so a name match alone proves nothing.
#   - Full pagination: a Dashboard-created coupon is found on any page.
#   - Cap is terminal: Stripe marks a coupon invalid once max_redemptions is
#     reached. A spec-matching but no-longer-valid coupon means the 25 seats
#     are GONE — the script aborts rather than minting 25 more. Reopening
#     founding is a pricing decision for Anthoney, never this script.
#   - Ambiguity (two spec-matching valid coupons, or a name-match with wrong
#     fields) aborts with instructions instead of guessing.
#   - The create path requires exit code 0 AND verifies every field of the
#     returned coupon before its ID is stored.
# Tested by tests/test-finish-founding.sh against a stubbed stripe/supabase.
set -euo pipefail
cd "$(dirname "$0")"

decision_file=$(mktemp)
create_err=$(mktemp)
trap 'rm -f "$decision_file" "$create_err"' EXIT

# --- Find (with pagination) and classify any existing "Founding Coach" coupon.
python3 - "$decision_file" <<'PY'
import json, subprocess, sys

SPEC = dict(amount_off=5000, currency="usd", duration="forever", max_redemptions=25)
out_path = sys.argv[1]

coupons, starting_after = [], None
while True:
    cmd = ["stripe", "coupons", "list", "--live", "--limit", "100"]
    if starting_after:
        cmd += ["--starting-after", starting_after]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write("⛔ coupon listing failed — refusing to create blind "
                         "(a blind create risks a duplicate):\n" + r.stderr)
        sys.exit(2)
    try:
        page = json.loads(r.stdout)
        data = page["data"]
    except Exception as e:
        sys.stderr.write(f"⛔ could not parse coupon listing ({e}) — refusing to create blind.\n")
        sys.exit(2)
    coupons += data
    if not page.get("has_more"):
        break
    if not data:
        sys.stderr.write("⛔ malformed pagination (has_more with empty page) — aborting.\n")
        sys.exit(2)
    starting_after = data[-1]["id"]

named = [c for c in coupons if c.get("name") == "Founding Coach"]
spec_matches = [c for c in named if all(c.get(k) == v for k, v in SPEC.items())]
spec_ids = {c["id"] for c in spec_matches}
mismatched = [c for c in named if c["id"] not in spec_ids]
valid_matches = [c for c in spec_matches if c.get("valid")]

if len(valid_matches) == 1:
    with open(out_path, "w") as f:
        f.write("REUSE " + valid_matches[0]["id"])
elif len(valid_matches) > 1:
    ids = ", ".join(c["id"] for c in valid_matches)
    sys.stderr.write(f"⛔ ambiguous: {len(valid_matches)} valid 'Founding Coach' coupons all "
                     f"match the spec ({ids}). Deactivate the extras in the Dashboard, re-run.\n")
    sys.exit(3)
elif spec_matches:
    # Exact spec match exists but Stripe no longer considers it valid — the
    # usual cause is max_redemptions reached, i.e. all 25 founding seats sold.
    for c in spec_matches:
        sys.stderr.write(f"⛔ founding cap closed: coupon {c['id']} matches the spec exactly "
                         f"but is no longer valid (times_redeemed={c.get('times_redeemed')}, "
                         f"max_redemptions=25).\n")
    sys.stderr.write("Refusing to create a replacement — the first-25 cap "
                     "(PRICING_STRATEGY.md) is terminal. Reopening founding seats is a "
                     "pricing decision for Anthoney, not this script.\n")
    sys.exit(4)
elif mismatched:
    for c in mismatched:
        diffs = {k: c.get(k) for k in SPEC if c.get(k) != SPEC[k]}
        sys.stderr.write(f"⛔ coupon {c['id']} (valid={c.get('valid')}) is named "
                         f"'Founding Coach' but mismatches the spec on {diffs} (want {SPEC}).\n")
    sys.stderr.write("Refusing to reuse it or create a near-duplicate. Fix, rename, or "
                     "delete it in the Dashboard, then re-run.\n")
    sys.exit(3)
else:
    with open(out_path, "w") as f:
        f.write("CREATE")
PY

decision=$(cat "$decision_file")
case "$decision" in
  REUSE\ *)
    COUPON="${decision#REUSE }"
    echo "Reusing existing live coupon: $COUPON (all spec fields verified)"
    ;;
  CREATE)
    create_rc=0
    resp=$(stripe coupons create --live \
      --amount-off 5000 --currency usd --duration forever \
      --max-redemptions 25 --name "Founding Coach" 2>"$create_err") || create_rc=$?
    verdict=$(printf '%s' "$resp" | CREATE_RC="$create_rc" python3 -c '
import json, os, sys
SPEC = dict(amount_off=5000, currency="usd", duration="forever",
            max_redemptions=25, livemode=True, name="Founding Coach")
rc = os.environ.get("CREATE_RC", "?")
if rc != "0":
    print("ERR create command exited " + rc); sys.exit(0)
try:
    d = json.load(sys.stdin)
except Exception as e:
    print("ERR unparseable create response (" + str(e) + ")"); sys.exit(0)
cid = d.get("id")
if not cid:
    print("ERR create response has no coupon id"); sys.exit(0)
diffs = {k: d.get(k) for k, v in SPEC.items() if d.get(k) != v}
if diffs:
    print("ERR created coupon " + cid + " does not match spec: " + repr(diffs) +
          " -- inspect it in the Dashboard before re-running"); sys.exit(0)
print("OK " + cid)')
    case "$verdict" in
      OK\ *)
        COUPON="${verdict#OK }"
        echo "Created live coupon: $COUPON (returned object verified against spec)"
        ;;
      *)
        echo "⛔ Coupon create failed: ${verdict#ERR }"
        echo "Stripe response:"
        printf '%s\n' "$resp"
        echo "--- stderr ---"
        cat "$create_err"
        echo "If this is a key-permission error: the CLI uses a RESTRICTED key (rk_live_…)."
        echo "Fix: Dashboard → https://dashboard.stripe.com/coupons/create →"
        echo "  \$50 off, Forever, max 25 redemptions, name exactly 'Founding Coach' —"
        echo "  then re-run this script; it verifies and reuses that coupon."
        exit 1
        ;;
    esac
    ;;
  *)
    echo "⛔ internal error: unexpected decision '$decision'" >&2
    exit 1
    ;;
esac

echo "Storing as STRIPE_FOUNDING_COUPON on Supabase project njadrabgodqpzpbgkkbs..."
supabase secrets set STRIPE_FOUNDING_COUPON="$COUPON" --project-ref njadrabgodqpzpbgkkbs
supabase secrets list --project-ref njadrabgodqpzpbgkkbs | grep -i FOUNDING
echo "✓ Done. Founding checkout ('Claim a founding seat') opens on the next"
echo "  function invocation (~1 min). Cap of 25 is enforced by Stripe."
