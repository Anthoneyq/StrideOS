# Founding Coach coupon — Anthoney creates, Codex verifies (read-only)

**Context:** StrideOS founding checkout ($199→$149/yr, first 25 seats) is
blocked on one missing live Stripe coupon. The CLI's restricted key cannot
create coupons (verified: `invalid_request_error`, req_lYwQirrKnekJdT), so it
must be made in the Dashboard. Creating it is a live money-side write — per
DECISION_RIGHTS / the Binary Wall that is **Anthoney's action, no AI's**.
Codex's role is strictly read-only verification: it opens pages, reads, and
reports; it must never fill, click Save, or otherwise change anything in
Stripe.

## [YOU] Anthoney — create the coupon (~30s)

1. Pre-check at https://dashboard.stripe.com/coupons — ALL three before
   creating anything, stop if any fails:
   - account is **Anthoneyq** (`acct_1NlGuoCGBxSHKYzS` — visible in the
     account menu / URL),
   - **Test mode OFF** (live),
   - **zero** existing coupons named "Founding Coach" (if one exists, do NOT
     create another — just run the wiring script below; it verifies and
     reuses it).
2. Go to https://dashboard.stripe.com/coupons/create and enter exactly:
   - **Name:** `Founding Coach`  ← exact string, it is the script's match key
   - **Discount type:** Fixed amount discount → **$50.00 USD**
   - **Duration:** **Forever**
   - **Redemption limits:** limit total redemptions → **25**
   - No promotion code; every other field default.
3. Save.

## [CODEX] Read-only verification — after Anthoney saves

**Hard limits:** read-only. Do not create, edit, delete, fill, or save
anything, anywhere in the Dashboard. If verification fails, report — do not
fix.

1. Open `https://dashboard.stripe.com/coupons` (account **Anthoneyq**,
   `acct_1NlGuoCGBxSHKYzS`, Test mode OFF — if wrong, report and stop).
2. Confirm exactly ONE coupon named **Founding Coach** exists. Zero or more
   than one → report and stop.
3. Open its detail page and verify all of: **$50.00 USD off · Forever ·
   limited to 25 redemptions · 0 redeemed · live mode**.
4. Report back: the coupon ID, each verified term, and a screenshot of the
   detail page.

## [YOU] Anthoney — wire it (terminal, after Codex verifies)

```
bash "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS/finish-founding.sh"
```

(From a Claude Code prompt, prefix the line with `!` to run it in-session;
in a plain terminal, run it exactly as written.)

The script independently re-verifies all four terms against the Stripe API,
reuses the coupon, and stores `STRIPE_FOUNDING_COUPON` on Supabase. Founding
checkout opens ~1 min later. If any term is off, it aborts with a
field-by-field diff instead of wiring a bad coupon.
