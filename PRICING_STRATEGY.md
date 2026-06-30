# StrideOS - Pricing Strategy Map

**Date:** 2026-06-30  
**Purpose:** lock the launch pricing ladder, remove the old `$24/mo` ambiguity, and define how Free, Pro, Founding, and Team/Program plans should differ.  
**Decision owner:** Anthoney.

---

## 0. Recommended pricing decision

Use this ladder for launch:

| Plan | Launch price | Buyer | Positioning |
|---|---:|---|---|
| **Anonymous Free** | `$0` | Any coach, athlete, parent, or curious visitor | Full no-login calculator experience, no saved cloud data. |
| **Free Account** | `$0` | Coaches or self-trained athletes willing to sign in | Same free value, plus up to 3 saved active athletes so StrideOS can start building a relationship through email. |
| **Founding Coach** | **`$149/yr`, annual only, first 25 seats** | First serious early adopters | Same as Pro, but price locked for life while the subscription stays active. |
| **Pro Coach** | **`$19.99/mo` or `$199/yr`** | Individual coach / small private coach | One-coach workspace for serious use without team administration. |
| **Team Starter** | **`$399/yr`** | Small school, club, or training group | Multi-athlete team workflow, staff access, and team-level reporting. |
| **Team Plus** | **`$599/yr`** | Medium program | Larger roster, more staff, stronger program workflow. |
| **Program** | **`$999/yr`** | Large school/club/program | Up to 200 active athletes, program admin, and priority onboarding. |
| **Enterprise / 200+** | Custom | Very large org | Custom roster, data, support, and compliance needs. |

**Decision:** keep monthly at `$19.99`, set standard annual at `$199`, and use `$149/yr` as the first-25 Founding Coach price.

Do **not** launch `$24/mo`. Do **not** use `$249/yr` while monthly is `$19.99`, because `$19.99 x 12 = $239.88`; a `$249` annual plan would cost more than paying monthly.

---

## 1. Why `$199/yr` standard + `$149/yr` founding is the cleanest answer

### Standard Pro

`$19.99/mo` is the clean monthly anchor. It is familiar, low-friction, and directly comparable to the apps coaches already see.

`$199/yr` is the right annual number if monthly stays `$19.99`:

- `$19.99 x 12 = $239.88`
- `$199/yr = $16.58/mo effective`
- Annual buyers save `$40.88/yr`, or about **17%**

That is a normal, believable annual discount. It is not so cheap that it makes the product feel small, and it does not create a confusing "save 40%" claim that may feel too promotional for a serious coaching tool.

### Founding Coach

`$149/yr` is a better founding price than `$144/yr`.

- `$144/yr = exactly $12/mo`
- `$149/yr = $12.42/mo`
- `$149` feels like a real annual software price while still being clearly below `$199`
- Founding buyers save `$50/yr` versus standard Pro, or about **25%**

That discount is meaningful enough to create urgency, but the revenue give-up is tiny because the cohort is capped. If all 25 founding seats take it, the maximum annual discount versus `$199` is only `$1,250/yr`. That is worth paying if it gets the first serious WTP signal.

### Lifetime lock vs first-year discount

Use a lifetime lock for the first 25 seats, with guardrails:

- The lock applies to the **Pro Coach** plan only.
- The lock stays active only while their subscription stays active.
- If they cancel, they lose the founding lock.
- Future Team/Program features can still require a Team/Program plan.
- You can still add fair-use language for abuse, resale, or non-normal usage.

Do **not** make the founding offer "first year only" unless you are forced to. A first-year discount is weaker psychologically and creates a renewal objection later. The point of founding pricing is to convert "I love it" into "here is my card" now.

---

## 2. Market anchors

Current public anchors checked on 2026-06-30:

| Product | Public price anchor | Lesson for StrideOS |
|---|---:|---|
| **VDOT calculator** | Free calculator | Free calculators set the baseline. StrideOS must beat free tools on usefulness before asking for money. |
| **TrainingPeaks Coach Edition** | Coach base plan plus premium-athlete add-ons starting around `$9/athlete/mo`, with lower rates at higher volumes | Per-athlete pricing is accepted in coaching software, but it becomes expensive fast. StrideOS can position Team as high-value and simpler. |
| **Final Surge Coach** | `$19/mo` for 1-5 athletes, `$39/mo` up to 100 athletes | `$19.99/mo` is not aggressive for an individual coach. `$399/yr` team pricing is plausible if the team features are real. |
| **CoachNow** | Pro/Academy tiers around hundreds of dollars per year | Programs already pay annual software prices when the product supports coaching operations, not just a calculator. |

**Takeaway:** `$19.99/mo` and `$199/yr` are defensible. The team plan should not be justified by "more data storage." It should be justified by multi-coach workflow, roster scale, lineup/team-points decisions, reporting, and program administration.

### Competitive analysis notes

An outside competitive scan supports the current ladder, but its exact numbers should be used carefully because some public pricing pages are hard to verify. The useful signal is strategic:

- **Do not change the launch prices.** `$199/yr` Pro and `$149/yr` Founding are still attractive against high-touch endurance platforms and coach-operations tools.
- **Team pricing must sell intelligence, not storage.** `$399/$599/$999` only works if Team delivers team-points lineup strategy, roster-level progression, district/region context, and program reports. A bigger athlete cap alone is not enough.
- **Budget tools are the real objection.** Final Surge-style flat pricing and cheap team-management tools can make StrideOS look expensive unless StrideOS clearly answers "what should I do with this roster?" better than a log, spreadsheet, or calculator.
- **Video tools are adjacent, not direct competitors.** TrackBoss, Onform, and CoachNow compete for the same school/program budget, but StrideOS should not try to become video software. The differentiation is performance intelligence.
- **Communication is a future value lever, not the launch wedge.** Lightweight coach notes, shareable athlete reports, and eventually athlete/coach feedback can raise retention. The launch wedge should remain prediction quality, roster intelligence, and team decisions.

---

## 3. Free-to-paid ladder

The free strategy should be generous on trust-building value, strict on ownership/scale.

| Layer | Price | What they get | What stays paid |
|---|---:|---|---|
| **Anonymous Free** | `$0` | Full single-athlete calculator, zones, CV/VO2, confidence language, demo squad taste, no login required | Cloud save, unlimited roster, exports, team workflow |
| **Free Account** | `$0` | Same free value, plus saved limited account data, email relationship, one small roster/squad up to 3 active athletes | Bulk import, unlimited save/sync, PDF/team reports, lineup optimizer |
| **Founding Coach** | `$149/yr` | Pro access plus lifetime price lock while active, first 25 seats only | Team/Program features unless they upgrade |
| **Pro Coach** | `$19.99/mo` or `$199/yr` | One coach account, up to 25 active athletes, save/sync, bulk import for one roster, race forecasts, environment adjustments, PDF exports, individual event-fit work | Multi-coach staff, larger roster bands, team-points optimizer, district/region scoring, program reporting |
| **Team/Program** | `$399-$999/yr` | Multi-coach seats, larger roster bands, shared team workspace, lineup/team-points optimizer, team reports, program admin | Custom enterprise needs |

This keeps the promise clear:

- Free proves StrideOS is useful.
- Free Account captures the relationship.
- Pro sells serious individual workflow.
- Team sells operational leverage for a whole program.

---

## 4. Team and program pricing

Do **not** lead with a visible `$5/athlete/year` formula at launch. It creates math friction and makes the buyer think about cost per kid before they understand the program value.

Use simple roster bands:

| Plan | Price | Active athletes | Coach seats | Best for |
|---|---:|---:|---:|---|
| **Team Starter** | `$399/yr` | 1-25 | 2 | Small team, club group, private coach with assistants |
| **Team Plus** | `$599/yr` | 26-75 | 4 | Normal HS distance program or serious club |
| **Program** | `$999/yr` | 76-200 | 10 | Large school, full track/XC program, multi-group club |
| **Enterprise** | Custom | 200+ | Custom | Districts, multi-site orgs, custom compliance |

This gives you the economic logic of per-athlete pricing without making the checkout page feel like a spreadsheet.

If you later need a usage-based model, use it behind the scenes:

- `$399/yr` includes the first 25 active athletes.
- Additional roster bands can be calculated internally.
- Do not expose nickel-and-dime line items until Team demand is proven.

### Public school purchasing

Team and Program plans should be sold to public schools as **annual school/team software licenses**, not as consumer subscriptions. The pricing can stay the same, but the payment path needs to support school buying behavior:

- Quote before purchase
- Purchase order support
- Invoice support
- W-9/vendor packet
- Check, ACH, school card, or booster-supported payment where allowed
- Privacy/security summary for ADs, business offices, and district technology reviewers

Use `SCHOOL_PURCHASING_PLAYBOOK.md` as the operating guide for school-funded Team/Program sales.

---

## 5. Product differentiation by plan

### Pro Coach should mean

- Single coach account
- One primary roster/workspace
- Up to 25 active athletes
- Cloud save/sync
- Bulk import for one roster
- Individual athlete profiles
- Race forecasts and confidence bands
- Environmental adjustments
- PDF export / report card
- Individual event-fit analysis

### Team/Program should mean

- Multiple coach seats
- Shared team workspace
- Roster groups by squad/event/season
- Higher athlete caps
- Staff roles/permissions
- Team-points lineup optimizer
- District/region scoring context
- Program-level reports
- Team export package
- Priority onboarding/support

**Important:** Team is not "Pro with more athletes." Team is "the program workflow." That is what justifies almost double or more than Pro.

---

## 6. Implementation notes

Pricing should become a real entitlement model, not scattered copy.

Recommended plan codes:

```text
free_anonymous
free_account
founding_pro_annual
pro_monthly
pro_annual
team_starter_annual
team_plus_annual
program_annual
enterprise_custom
```

Recommended entitlement fields:

```text
plan_code
price_display
stripe_price_id
billing_interval
athlete_cap
coach_seat_cap
can_save_cloud
can_bulk_import
can_export_pdf
can_use_environment_adjustments
can_use_team_optimizer
can_manage_staff
can_use_program_reports
support_level
```

Known implementation cleanup:

- `stride-config.js` currently says `$19.99/mo` and `$144/yr`; if this strategy is accepted, annual display should become `$199/yr`.
- `index.html` currently frames annual as "save 40%" and `$12/mo`; if accepted, this should become "save 17%" and `$16.58/mo billed yearly`.
- `deploy-stripe-functions.sh` still guards around `$144/yr`; if accepted, it should require Stripe annual amount `19900`.
- `create-checkout-session` comments still mention `$144/yr`; update after Stripe prices are created.
- `team_annual` currently records like ordinary Pro in the subscription model; fix before broad Team sales by storing `plan_code` from Stripe metadata.
- Do not deploy live Stripe changes until the exact plan ladder is confirmed.

Suggested Stripe prices after decision:

| Plan code | Stripe amount |
|---|---:|
| `pro_monthly` | `1999` monthly |
| `pro_annual` | `19900` yearly |
| `founding_pro_annual` | `14900` yearly |
| `team_starter_annual` | `39900` yearly |
| `team_plus_annual` | `59900` yearly |
| `program_annual` | `99900` yearly |

---

## 7. What to ask Alex and Doug

Use the founding offer as the WTP gate:

> "I'm opening the first 25 Founding Coach seats for StrideOS at `$149/year`, locked for life while your subscription stays active. After those seats are gone, Pro is `$199/year` or `$19.99/month`. Founding gets the full Pro plan, direct feedback access, and your roster will shape the roadmap. I want this to be real software, so I am asking for the card now instead of treating interest as demand."

If they pay, you have a real signal. If they stall, the product may still be interesting, but WTP is not proven.

---

## 8. Final decision checklist

- **Monthly Pro:** `$19.99/mo`
- **Annual Pro:** `$199/yr`
- **Free Account:** `$0`, up to 3 active athletes
- **Founding Coach:** `$149/yr`, first 25, lifetime lock while active
- **Founding scope:** Pro plan only, not future Team/Program features
- **Team Starter:** `$399/yr`, 1-25 active athletes, 2 coach seats
- **Team Plus:** `$599/yr`, 26-75 active athletes, 4 coach seats
- **Program:** `$999/yr`, 76-200 active athletes, 10 coach seats
- **Retired:** `$24/mo`
- **Do not use:** `$249/yr` unless monthly becomes at least `$24.99/mo`

Once this checklist is accepted, the next pass should align `stride-config.js`, `index.html`, `deploy-stripe-functions.sh`, `create-checkout-session` comments, `Stripe_Setup_SOP.md`, and the Stripe Price IDs.
