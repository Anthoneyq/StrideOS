# StrideOS — Decisions & Operator Actions (2026-07-01)

Follow-up to `REVIEW_2026-07-01.md`. This pass I **fixed the two remaining
safely-fixable items in code** and turned the rest into a decision list.

## ✅ Shipped this pass (committed, verified: 31/31 benchmarks, JS parses)
- **Bulk import now supports multi-event PRs** (`dca2e6d`). Roster CSV/XLSX
  with event-named columns (`800m`, `1600m`, `3200m`, …) populates each
  athlete's `additionalPRs`, so imported rosters can use Multi-Event Analysis
  without hand-editing. Exact-match auto-detect (no `200m`↔`3200m` /
  half↔full-marathon mis-maps). Fully backward compatible.
- **Data & Privacy UI** (`b27665b`). Wired the existing-but-unused
  `export_coach_data()` (download JSON) and `request_account_deletion()`
  (typed-DELETE confirm → sign out) RPCs into the signed-in sidebar. Closes
  the M5 self-serve export/delete gap for minors' PII.

---

## 🔴 Needs a decision from you (I'll implement whichever you pick)

### D1 · Team pricing bands
Today: Team button charges ONE price ($399 `team_annual`); the bands
"Starter 1–25 · Plus 26–75 · Program 76–200" are *descriptive only* — a
200-athlete program pays the same $399 as a 10-athlete squad, with no seat
enforcement.
- **(a) Real 3-band pricing (recommended).** I add a `team` tier + seat count
  to the DB + `apply_stripe_subscription`, read `metadata.plan` in the
  webhook, wire Plus/Program prices. You create 2 Stripe prices + apply 1
  migration.
- **(b) One honest team price.** Drop the band language; keep $399 flat. I do
  it now (10 min).
- **(c) "Contact us" for 26+.** Manual invoicing for big programs.
- **Need:** which model + (if a) the seat→price map.

### D2 · Founding Coach $149 (button is currently dead)
Today: the "$149/yr, first 25 seats" button just opens signup → they'd get
charged $199/$19.99, not $149.
- **(a) Stripe coupon (recommended).** Create a FOUNDING coupon (annual
  $199→$149, capped at 25 redemptions); founding button starts annual
  checkout with it auto-applied. No new tier. I wire the coupon param; you
  create the coupon.
- **(b) Real `founding` price + plan + 25-seat guard.** More code + Stripe.
- **(c) Manual claim.** Reframe copy to "email to claim." I do it now (10 min).
- **Need:** which + confirm the 25-seat cap.

### D3 · Training-age zones for younger athletes
**Finding: mostly already handled.** `smartGuardrailDefault` auto-picks
*conservative* for age<14 / (<16 & <2yr training) / <1yr training, and the
graduated `applyGuardrail` already pulls a conservative HS athlete's tempo to
≈85% (not 88%). Doug's 80–85% ask is largely met when the guardrail applies.
- **(a) Surface it (recommended).** Show the active guardrail + "why" on the
  front calculator (today it's only on the athlete edit screen) and default
  new HS/MS athletes to conservative more visibly. Low risk — I can do it.
- **(b) Wire `grade` into the default** (MS → more conservative). Small.
- **(c) Retune the exact bands.** Give me the numbers; I'll encode them. I
  won't change prescription math for minors without your explicit numbers.

### Sec · Strava OAuth CSRF nonce
`state` = raw athlete UUID, no single-use nonce. Low exploitability (UUIDs act
as secrets) but an anti-pattern.
- **(a) Fix it.** I add a `strava_oauth_nonces` table + migration + mint/consume
  a nonce in the connect flow. It's an auth flow I can't E2E-test, so you'd
  smoke-test Strava connect on staging after deploy. (I did **not** ship this
  blind — a subtle error would break every connect.)
- **(b) Defer** — accept the low risk for launch, revisit after.

### Lower priority
- **Per-PR dates for additional PRs** — mostly moot after the single-anchor
  forecast fix. (a) build it (needs a `race_date` column migration); **(b)
  skip until a coach asks (recommended).**
- **Near-duplicate forecast rows** (1500/Mile/1600, 3000/3200/2 Mile) — (a)
  collapse; **(b) keep all (recommended)** — US coaches race 1600m/3200m and
  want the exact distance; (c) group visually.
- **3200m ~1% fast for a mile-only anchor** — (a) leave until you have
  held-out validation data (roadmap C1, recommended); (b) apply an empirical
  fudge now (risky without data).

---

## 🛠️ Operator actions (your credentials / deploy — I can't run these)

- **M1 · Deploy.** Live site is a stale build. `git push` (3 new commits:
  `52df56d`, `dca2e6d`, `b27665b`), then `supabase db push`,
  `supabase config push` (picks up the new `verify_jwt` blocks),
  `supabase functions deploy` (incl. both strava functions), Vercel deploy of
  `index.html`.
- **M2 · Stripe live prices.** Create $199/yr (19900¢) + $19.99/mo (1999¢),
  set the env vars, run `deploy-stripe-functions.sh` (now validates $199).
- **M3 · Enable pg_cron** + confirm `expire_trials` is scheduled — else trials
  never expire.
- **M4 · Apply + smoke-test the Strava workouts-index migration**
  (`20260529173000`) on staging: Connect → Sync Now → re-sync imports 0.
- **M5 · Legal.** Lawyer-review ToS/Privacy (minors' PII) and surface them
  in-app (acceptance is recorded but the docs aren't shown). The
  export/delete UI is now built — you just link the legal text.
