#!/usr/bin/env bash
# Stubbed-CLI test for finish-founding.sh — proves the fail-closed contract
# without ever touching Stripe or Supabase. Run: bash tests/test-finish-founding.sh
set -euo pipefail
SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/finish-founding.sh"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# --- stub binaries -----------------------------------------------------------
mkdir -p "$WORK/bin"
cat > "$WORK/bin/stripe" <<'STUB'
#!/usr/bin/env bash
echo "stripe $*" >> "$STUB_LOG"
GOOD_CREATE='{"id":"cpn_NEW","name":"Founding Coach","valid":true,"livemode":true,"amount_off":5000,"currency":"usd","duration":"forever","max_redemptions":25,"times_redeemed":0}'
case "$1 $2" in
  "coupons list")
    [ -n "${LIST_FAIL:-}" ] && { echo "simulated: expired/blocked key" >&2; exit 1; }
    if [[ " $* " == *" --starting-after "* ]]; then cat "$PAGE2"; else cat "$PAGE1"; fi
    ;;
  "coupons create")
    if [ -n "${CREATE_FAIL:-}" ]; then
      printf '%s' '{"error":{"message":"This API key does not have coupon write access"}}'
      exit 1
    fi
    if [ -n "${CREATE_RC_FAIL:-}" ]; then
      printf '%s' "$GOOD_CREATE"   # plausible body, but the command FAILED
      exit 1
    fi
    if [ -n "${CREATE_BAD:-}" ]; then
      printf '%s' '{"id":"cpn_WRONG","name":"Founding Coach","valid":true,"livemode":true,"amount_off":9900,"currency":"usd","duration":"forever","max_redemptions":25}'
      exit 0
    fi
    printf '%s' "$GOOD_CREATE"
    ;;
esac
STUB
cat > "$WORK/bin/supabase" <<'STUB'
#!/usr/bin/env bash
echo "supabase $*" >> "$STUB_LOG"
[ "$1 $2" = "secrets list" ] && echo "STRIPE_FOUNDING_COUPON  digest123"
exit 0
STUB
chmod +x "$WORK/bin/stripe" "$WORK/bin/supabase"

# --- fixtures ----------------------------------------------------------------
GOOD='{"id":"cpn_GOOD","name":"Founding Coach","valid":true,"amount_off":5000,"currency":"usd","duration":"forever","max_redemptions":25}'
GOOD2='{"id":"cpn_GOOD2","name":"Founding Coach","valid":true,"amount_off":5000,"currency":"usd","duration":"forever","max_redemptions":25}'
BAD_AMT='{"id":"cpn_BAD","name":"Founding Coach","valid":true,"amount_off":9900,"currency":"usd","duration":"forever","max_redemptions":25}'
BAD_AMT_INVALID='{"id":"cpn_BADOLD","name":"Founding Coach","valid":false,"amount_off":9900,"currency":"usd","duration":"forever","max_redemptions":25}'
EXHAUSTED='{"id":"cpn_FULL","name":"Founding Coach","valid":false,"amount_off":5000,"currency":"usd","duration":"forever","max_redemptions":25,"times_redeemed":25}'
OTHER='{"id":"cpn_OTHER","name":"Free Forever","valid":true,"amount_off":null,"currency":null,"duration":"forever","max_redemptions":null}'
empty_page() { echo '{"object":"list","data":[],"has_more":false}'; }
page() { echo "{\"object\":\"list\",\"data\":[$1],\"has_more\":${2:-false}}"; }

# --- runner ------------------------------------------------------------------
PASS=0; FAIL=0
run_case() { # name expected_exit
  local name=$1 expected=$2 rc=0
  export STUB_LOG="$WORK/$name.log" PAGE1="$WORK/$name.p1" PAGE2="$WORK/$name.p2"
  : > "$STUB_LOG"
  PATH="$WORK/bin:$PATH" bash "$SCRIPT" > "$WORK/$name.out" 2>&1 || rc=$?
  if [ "$expected" = NONZERO ]; then
    [ "$rc" -ne 0 ] && return 0
  elif [ "$rc" -eq "$expected" ]; then
    return 0
  fi
  echo "  exit=$rc wanted=$expected"; sed 's/^/  | /' "$WORK/$name.out"; return 1
}
check() { # ok description
  if [ "$1" -eq 0 ]; then PASS=$((PASS+1)); echo "✓ $2"
  else FAIL=$((FAIL+1)); echo "✗ $2"; fi
}
log_has()    { grep -q -- "$2" "$WORK/$1.log"; }
log_lacks()  { ! grep -q -- "$2" "$WORK/$1.log"; }
out_has()    { grep -q -- "$2" "$WORK/$1.out"; }

# 1. Listing failure → abort, create NEVER called (fail closed).
export LIST_FAIL=1
ok=0; run_case t1 NONZERO && log_lacks t1 "coupons create" && out_has t1 "refusing to create blind" || ok=1
check $ok "list failure aborts without calling create"
unset LIST_FAIL

# 2. Valid name-match with wrong amount → abort, no reuse, no create.
page "$BAD_AMT" > "$WORK/t2.p1"
ok=0; run_case t2 NONZERO && log_lacks t2 "coupons create" && log_lacks t2 "secrets set" && out_has t2 "mismatches the" || ok=1
check $ok "invalid name-match rejected (no reuse, no create)"

# 3. Valid spec-matching coupon → reused, no create, secret stored.
page "$GOOD" > "$WORK/t3.p1"
ok=0; run_case t3 0 && log_lacks t3 "coupons create" && log_has t3 "secrets set STRIPE_FOUNDING_COUPON=cpn_GOOD" && out_has t3 "Reusing existing live coupon: cpn_GOOD" || ok=1
check $ok "valid match reused and stored"

# 4. No match + create error → actionable failure output, nothing stored.
empty_page > "$WORK/t4.p1"
export CREATE_FAIL=1
ok=0; run_case t4 NONZERO && out_has t4 "Coupon create failed" && out_has t4 "coupon write access" && log_lacks t4 "secrets set" || ok=1
check $ok "create error is surfaced and actionable"
unset CREATE_FAIL

# 5. No match + clean create → returned object field-verified, then stored.
empty_page > "$WORK/t5.p1"
ok=0; run_case t5 0 && log_has t5 "coupons create" && out_has t5 "returned object verified against spec" && log_has t5 "secrets set STRIPE_FOUNDING_COUPON=cpn_NEW" || ok=1
check $ok "clean create path verifies fields and stores new coupon"

# 6. Match on page 2 → pagination followed, reused (Dashboard fallback works).
page "$OTHER" true > "$WORK/t6.p1"
page "$GOOD" > "$WORK/t6.p2"
ok=0; run_case t6 0 && log_has t6 "starting-after cpn_OTHER" && log_lacks t6 "coupons create" && log_has t6 "secrets set STRIPE_FOUNDING_COUPON=cpn_GOOD" || ok=1
check $ok "match found via pagination and reused"

# 7. Two valid spec-matching coupons → ambiguous, abort, no writes.
page "$GOOD,$GOOD2" > "$WORK/t7.p1"
ok=0; run_case t7 NONZERO && log_lacks t7 "coupons create" && log_lacks t7 "secrets set" && out_has t7 "ambiguous" || ok=1
check $ok "ambiguous duplicate matches abort"

# 8. REGRESSION (cap is terminal): spec-match exists but invalid (25/25
#    redeemed) → abort "founding cap closed"; NEVER create a replacement.
page "$EXHAUSTED" > "$WORK/t8.p1"
ok=0; run_case t8 NONZERO && out_has t8 "founding cap closed" && log_lacks t8 "coupons create" && log_lacks t8 "secrets set" || ok=1
check $ok "exhausted coupon closes the cap instead of minting 25 more seats"

# 9. Create returns a plausible coupon body but a NONZERO exit code → the exit
#    code wins; nothing is stored.
empty_page > "$WORK/t9.p1"
export CREATE_RC_FAIL=1
ok=0; run_case t9 NONZERO && out_has t9 "create command exited 1" && log_lacks t9 "secrets set" || ok=1
check $ok "create exit code is preserved even when the body looks valid"
unset CREATE_RC_FAIL

# 10. Create exits 0 but the returned coupon mismatches the spec → abort with
#     the diff; nothing is stored.
empty_page > "$WORK/t10.p1"
export CREATE_BAD=1
ok=0; run_case t10 NONZERO && out_has t10 "does not match spec" && log_lacks t10 "secrets set" || ok=1
check $ok "mismatched create response is rejected before storing"
unset CREATE_BAD

# 11. Name-match with wrong spec AND valid=false still blocks creation
#     (mismatches are detected regardless of validity).
page "$BAD_AMT_INVALID" > "$WORK/t11.p1"
ok=0; run_case t11 NONZERO && out_has t11 "mismatches the" && log_lacks t11 "coupons create" && log_lacks t11 "secrets set" || ok=1
check $ok "invalid mismatched name-match still blocks creation"

echo "----------------------------------------"
echo "finish-founding: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
