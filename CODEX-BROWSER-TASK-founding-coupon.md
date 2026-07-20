# Codex browser task — create the live Founding Coach coupon in Stripe

**Context:** StrideOS founding checkout ($199→$149/yr, first 25 seats) is blocked
on one missing live Stripe coupon. The CLI's restricted key cannot create
coupons (verified: `invalid_request_error`, req_lYwQirrKnekJdT), so it must be
made in the Dashboard where Anthoney is logged in. A verified script
(`finish-founding.sh`) then finds, field-checks, and wires it — Codex does NOT
touch Supabase or the terminal.

**Hard limits:** create exactly ONE coupon with exactly the terms below.
Change nothing else in the Dashboard — no promotion codes, no price edits, no
deletions, no other products. If anything looks different than described,
STOP and report back instead of improvising.

## Steps

1. Go to `https://dashboard.stripe.com/coupons/create`.
2. Confirm the account is **Anthoneyq** (`acct_1NlGuoCGBxSHKYzS`) and **Test
   mode is OFF** (must be live mode). If either is wrong, STOP and report.
3. Pre-check: open `https://dashboard.stripe.com/coupons` in a tab — if a
   coupon named **Founding Coach** already exists, STOP and report (do not
   create a duplicate).
4. On the create form, enter exactly:
   - **Name:** `Founding Coach`  ← exact string, it is the script's match key
   - **Discount type:** Fixed amount discount → **$50.00 USD**
   - **Duration:** **Forever**
   - **Redemption limits:** enable "Limit the total number of times this
     coupon can be redeemed" → **25**
   - Do NOT create/attach a promotion code. Leave every other field default.
5. Save.
6. Verify on the coupon's detail page: **$50.00 USD off, Forever, limited to
   25 redemptions, name "Founding Coach", live mode.** Copy the coupon ID.
7. Report back: the coupon ID + a screenshot of the detail page.

## After Codex finishes (Anthoney, terminal)

```
! bash "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS/finish-founding.sh"
```

The script verifies all four terms against Stripe, reuses the coupon, and
stores `STRIPE_FOUNDING_COUPON` on Supabase. Founding checkout opens ~1 min
later. If the coupon terms are off by anything, the script aborts with a
field-by-field diff instead of wiring it.
