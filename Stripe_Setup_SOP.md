---
file: Stripe_Setup_SOP.md
folder: 09_Products/StrideOS
purpose: 30-minute setup so Alex / Doug / other coaches can pay $20/mo via a single Stripe Payment Link
target: send link in v2 email today or tomorrow
scope: Payment Link only (no code, no Supabase, no app gating)
revisit: after first paid signup, evaluate full subscription gating (Scope B)
---

# Stripe Setup — Stride OS $20/mo Payment Link

> The whole point of this doc: smallest possible path from "two warm coaches" to "first paid customer." No code. No Supabase wiring. No app changes. Just a URL you paste in the email.

## What you'll have when this is done

1. A Stripe account that can accept money.
2. A Product in Stripe called "Stride OS — Coach Subscription."
3. A Payment Link (a URL like `https://buy.stripe.com/...`) that Alex and Doug can click to subscribe.
4. The v2 email updated to include the link with the right framing.

## Step 1 — Create or sign into Stripe (5 min)

1. Go to **https://dashboard.stripe.com/register** (or login if you already have an account).
2. Sign up with `thelabstrength@gmail.com`.
3. Stripe asks for country: **United States**.
4. **Activate the account** (you'll see a yellow banner — "Activate payments"). This is the step that lets you take real money.

## Step 2 — Activate payments (10 min — only step that requires your real info)

Stripe needs four things, all are paths of least resistance for a sole-prop coaching business:

| Field | What to put |
|---|---|
| Business type | **Individual / Sole proprietorship** |
| Industry | **Personal training services** (or "Health, fitness, and beauty services" if that's the option shown) |
| Tax ID | **Your SSN** (sole prop default — you don't need an EIN) |
| Bank account | Your business or personal checking account — routing # + account # |

Statement descriptor (what shows on customers' card statements): **STRIDE OS** (or **AQ COACHING** — your call. Max 22 characters. Customers see this on their bank statement so make it recognizable.)

Stripe may ask for a phone number for SMS verification. Use yours.

After activation Stripe shows a green checkmark. You're now able to accept payments.

## Step 3 — Create the Product (5 min)

In the Stripe Dashboard:

1. Left nav → **Product catalog** → **Add product**.
2. Fill in:
   - **Name:** `Stride OS — Coach Subscription`
   - **Description:** `Ongoing access to Stride OS, the pace calculator and race prediction tool for running coaches. Built by Anthoney Quebedeaux, CSCS.`
   - **Image:** optional — you can add the Stride OS logo later if you have one
3. Pricing:
   - **Pricing model:** Recurring
   - **Price:** `$20.00`
   - **Billing period:** Monthly
4. Click **Save product**.

Stripe creates the product. You'll land on the product detail page.

## Step 4 — Create the Payment Link (3 min)

On the product detail page (or via **Payment links** in the left nav):

1. Click **Create payment link** (or **Payment links** → **+ New**).
2. Confirm the product: **Stride OS — Coach Subscription** at **$20.00 / month**.
3. Quantity: **Customer can choose quantity → OFF** (you don't want them buying 17 subscriptions by accident).
4. Options worth turning on:
   - **Collect customer's email** (default ON — leave it).
   - **Collect customer's name** (turn ON — you'll want to know it's Alex vs Doug vs a stranger).
   - **Allow promotional codes** (turn ON — costs nothing, useful if you ever want to give a coach a free month).
5. **After payment**: choose "Show confirmation page" → leave the Stripe default for now. (Later you can swap this for a "Thanks — here's the Stride OS link" custom page.)
6. Click **Create link**.

Stripe gives you a URL like `https://buy.stripe.com/aEUbJ06xC1Yp8aQ288`.

**That's the link you paste in the email.**

## Step 5 — Update the v2 email (2 min)

Open `Feedback/v2_email_draft_to_Alex_and_Doug.md` and replace the placeholder URL line near the bottom with this block:

```
Same link to play with it:
[YOUR VERCEL URL]

If you decide it's worth it long-term, here's a link to keep access at $20/mo:
[YOUR STRIPE PAYMENT LINK]

No pressure — try it first, decide later.
```

The framing is critical: **the app stays free. The link is for ongoing access after they've tried it.** This converts warmer than "pay first then try."

## Step 6 — Test it (3 min, before sending the email)

1. Open the Payment Link in a private/incognito browser window.
2. Stripe shows the checkout page with your product, $20/mo, and the fields you turned on.
3. Use Stripe's **test card** — `4242 4242 4242 4242`, any future date, any CVC — to simulate a purchase.

   **Wait** — actually, by default, the live Payment Link uses live mode. The test card won't work on the live link. Two options:
   - **Easier:** trust that Stripe's UI is correct. Don't actually pay yourself $20.
   - **Slightly better:** create a duplicate Payment Link in **Test mode** (toggle in Stripe top-right) and try the test card there.

   If both flows look correct in Stripe's UI, you're done.

4. Confirm you got an email from Stripe acknowledging the test charge (or that the test charge appears in the Payments tab).

## Step 7 — Send the email (2 min)

Open the email in Gmail or wherever you compose. Paste the body from `v2_email_draft_to_Alex_and_Doug.md`. Send to Alex first, then Doug, both individually (don't BCC — they're different relationships).

## What happens when the first person pays

1. Stripe charges their card $20.
2. You get an email from Stripe ("New subscription").
3. Money lands in your bank account ~2 business days later.
4. The subscription auto-renews monthly until they cancel.
5. **They can cancel anytime** via the link Stripe sends them, OR via a Customer Portal you can turn on later (in Stripe → Settings → Billing → Customer portal).

## What this does NOT do (deferred to Scope B)

- The Stride OS app does not yet check whether a user is subscribed. Anyone with the URL can use it. This is fine for the first 5–20 paying customers — trust-based access.
- There's no automatic "your access expires" if someone cancels. Again — fine for first cohort, you'll handle it manually.
- There's no admin dashboard to see "who's subscribed" — that lives in Stripe's dashboard. Check Stripe → Customers.

Build Scope B (Supabase webhook + app gating) only **after** revenue is real and at least one customer has paid for two months in a row. Until then, the gating is theater.

## What to track after sending the email

- Who clicked the link (Stripe shows this in Payment Link → Analytics).
- Who paid (Stripe → Customers).
- Note any feedback in `Feedback/` as new transcripts or notes.

Add one line to `_dashboards/CommandCenter/NEXT_MOVE.md` once a first paid customer lands: *"First paid Stride OS customer: [name], [date]."* That's a milestone worth marking.

## Time check

If you're more than 30 minutes into this and stuck, it's almost certainly Step 2 (activation) — that's where Stripe asks for the tax/bank info and it can feel tedious. Push through; everything after that is 2-minute UI clicks.

## Links

- Stripe Dashboard: https://dashboard.stripe.com/
- Payment Links docs: https://stripe.com/docs/payment-links
- Stripe support (use this if Step 2 hits a snag): https://support.stripe.com/
