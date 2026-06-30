# StrideOS - School Purchasing Playbook

**Date:** 2026-06-30  
**Purpose:** make Team and Program plans easy for public-school coaches to buy using school, athletic department, team, activity, or booster-supported funding.  
**Status:** working strategy, not legal advice. District rules vary.

---

## 0. Decision

Public schools should be sold Team and Program plans as an **annual school/team software license**, not as a consumer subscription.

Recommended school-facing plans:

| Plan | Annual price | Active athletes | Coach seats | School buying language |
|---|---:|---:|---:|---|
| **Team Starter** | `$399/yr` | 1-25 | 2 | Annual team license for one track/XC group. |
| **Team Plus** | `$599/yr` | 26-75 | 4 | Annual team license for a normal high school distance or combined track/XC program. |
| **Program** | `$999/yr` | 76-200 | 10 | Annual program license for a large school, full track/XC program, or multi-group staff. |
| **Enterprise** | Custom | 200+ | Custom | District, multi-campus, or special compliance purchase. |

The school purchase path should not force a coach to use a credit card. StrideOS should support:

- Quote
- Purchase order
- Invoice
- Check
- ACH
- School credit card
- Booster club or foundation payment when the district allows it

---

## 1. Why this matters

Most public-school coaches do not personally control software spending. Even when the price is reasonable, the coach often needs a business office, athletic director, bookkeeper, or booster club to approve and pay it.

The goal is to remove friction before the coach asks:

- The coach should know what to ask for.
- The AD/bookkeeper should understand what is being purchased.
- The business office should have the basic vendor packet.
- The district should see that StrideOS has student-data and payment process language ready.

Do not make the coach invent the purchasing process. Give them the exact words, forms, and email they can forward.

---

## 2. Best buying paths

### Path A: School athletic department or team budget

Best fit for Team Starter, Team Plus, and Program.

The coach asks the athletic director or campus bookkeeper:

> What is the correct process to purchase an annual team software license for track/cross country, and what vendor paperwork do you need from StrideOS?

Possible budget buckets to ask about:

- Athletic software
- Team supplies
- Instructional or technology software
- Professional services or subscription software
- Campus discretionary funds
- Team activity funds
- Booster-funded athletics purchase

Do not tell the coach to name a specific accounting code. Have them ask which category the district prefers.

### Path B: Booster club or foundation support

Good when the athletic department budget is tight.

The booster can either:

- Pay StrideOS directly, if district policy allows.
- Donate funds to the school/team and have the school pay StrideOS.
- Reimburse a school-approved purchase, if allowed.

The coach should not assume booster payment is allowed. Booster rules are district-specific.

### Path C: Coach pays for Pro

Good for early adopters and private coaches.

Use Pro Coach or Founding Coach here. This is the fastest path, but it should not be the default for public school Team/Program sales because it trains coaches to think StrideOS is a personal expense.

### Path D: District purchase

Use only when there are multiple campuses, a district lead, or a clear administrator sponsor.

This needs stronger vendor paperwork:

- Privacy/security summary
- Terms and Privacy Policy
- Data processing or student data privacy addendum, if requested
- Accessibility statement or VPAT-lite plan, if requested
- Insurance certificate, if requested
- Custom quote with campus list and service dates

---

## 3. Vendor packet StrideOS should prepare

Create a simple "School Vendor Packet" folder with these files.

### Must-have for first school sales

- **W-9** with legal business name, tax classification, address, and TIN.
- **Quote template** with plan, athlete cap, coach seats, school/team name, service dates, and total annual price.
- **Invoice template** that supports PO number, check/ACH/card, billing contact, and remittance details.
- **Terms of Service** linked from `docs/planning/STRIDE_OS_Terms_of_Service_BETA.md`.
- **Privacy Policy** linked from `docs/planning/STRIDE_OS_Privacy_Policy_BETA.md`.
- **Student-data/privacy one-pager** written for ADs, bookkeepers, tech directors, and parents.
- **Sole-source / unique-value one-pager** for districts that ask why this tool is different from a spreadsheet, calculator, or generic training log.

### Should-have before district-level sales

- Data Processing Addendum or Student Data Privacy Agreement template.
- Security overview: hosting, encryption, access controls, backups, deletion/export, incident contact.
- Accessibility statement or VPAT-lite roadmap.
- Subprocessor list, starting with Supabase and Stripe.
- Certificate of insurance, if requested by districts.
- Signed quote acceptance form.

---

## 4. Privacy and compliance posture

Use careful language. Do not make a blanket claim like "FERPA compliant" without legal review.

Better language:

> StrideOS is built to support a school or district's student-data privacy process. StrideOS uses athlete data only to provide the service, does not sell athlete data, does not run ads, restricts access by workspace, and supports data export/deletion on request. Final compliance review belongs to the school or district.

School-friendly product defaults:

- Coach-managed roster should work without requiring student login.
- Collect the minimum data needed for performance intelligence.
- Make athlete names optional where possible, or support initials/IDs for cautious schools.
- Do not collect medical records.
- Do not collect grades.
- Do not sell data.
- Do not target ads.
- Do not train outside AI models on identifiable athlete data without explicit permission.
- Support deletion and export.
- Keep clear audit language around who can access roster data.

High-friction items to resolve before broad school sales:

- Replace `[support email - TBD]` in legal/privacy docs with a real inbox.
- Decide whether under-13 athletes are allowed in Team/Program and how parental consent is handled.
- Decide whether athlete login is required. For public schools, "coach can use it without student accounts" is a major procurement advantage.
- Create a short privacy answer for ADs and technology directors.

---

## 5. School-facing positioning

The buyer should understand StrideOS as a performance intelligence tool, not just a running calculator.

Use this value stack:

1. **Better decisions:** roster-level event fit, race projection, pace guidance, and development signals.
2. **Less coach time:** imports and reports reduce spreadsheet work.
3. **Program clarity:** coaches can see which athletes are ready for which events and what the team needs next.
4. **More defensible planning:** reports help explain decisions to staff, athletes, and parents.
5. **Affordable annual license:** no punishing per-athlete monthly bill.

Avoid overclaiming:

- Do not claim StrideOS guarantees PRs.
- Do not claim it prevents injuries.
- Do not claim it replaces coach judgment.
- Do not frame it as medical, diagnostic, or health assessment software.

---

## 6. Coach email to AD or bookkeeper

Subject:

```text
Request to purchase StrideOS Team for track/cross country
```

Email:

```text
Hi [Name],

I would like to purchase StrideOS for our [track/cross country] program as an annual team software license.

StrideOS helps coaches turn roster and race-result data into training paces, event-fit decisions, race projections, and team/program reports. It would reduce spreadsheet work and give us a better way to make and explain athlete development decisions across the season.

The plan I am requesting is:

Plan: [Team Starter / Team Plus / Program]
Annual cost: [$399 / $599 / $999]
Athlete cap: [25 / 75 / 200 active athletes]
Coach seats: [2 / 4 / 10]
Service dates: [date] to [date]

Can this be paid from our track/XC team budget, athletics software/equipment line, activity fund, booster-supported funds, or another approved school funding source?

If this needs a quote, invoice, W-9, vendor form, PO number, or student-data/privacy review, StrideOS can provide those documents.

What is the correct process for getting this approved?

Thanks,
[Coach Name]
```

---

## 7. Short AD/business-office note

Use this when the AD or bookkeeper wants the plain version.

```text
StrideOS is an annual school/team software license for track and cross-country coaches. It supports roster analysis, training paces, race projections, athlete reports, and team-level planning. We are requesting approval to purchase the [plan name] annual license for [school/team] for [service dates] at [price].

Please let us know whether the purchase should be handled by card, purchase order, check, ACH, or booster-supported payment, and what vendor documents are required.
```

---

## 8. Quote and invoice wording

Use clear school-procurement language:

```text
Annual school/team license for StrideOS performance intelligence software for [School Name] [Track/Cross Country] program, including up to [athlete cap] active athletes and [coach seat cap] coach seats, for service dates [start] through [end].
```

Line-item examples:

| Plan | Line item |
|---|---|
| Team Starter | StrideOS Team Starter Annual School License, 1-25 active athletes, 2 coach seats |
| Team Plus | StrideOS Team Plus Annual School License, 26-75 active athletes, 4 coach seats |
| Program | StrideOS Program Annual School License, 76-200 active athletes, 10 coach seats |

Quote fields:

- School or district legal name
- Campus/team name
- Coach contact
- Billing contact
- Plan
- Athlete cap
- Coach seat cap
- Service dates
- Annual price
- Quote expiration date
- Payment methods
- Tax-exempt note, if applicable
- Vendor legal name and address

Invoice fields:

- Invoice number
- PO number
- Billing contact
- Remittance address
- ACH/check/card instructions
- Due date, usually net 30 for schools
- Service dates
- Plan and line item
- Total due

---

## 9. Objection handling

| Objection | Best answer |
|---|---|
| "Can we pay by purchase order?" | Yes. StrideOS should provide a quote first, then invoice against the PO once the school approves it. |
| "Can we pay by check?" | Yes, if StrideOS has a remittance address and invoice process. |
| "Can booster club pay?" | Often possible, but it depends on district policy. StrideOS can invoice either the school or the booster organization if the school allows it. |
| "Is this a student-data system?" | It stores athlete performance and roster information entered by coaches. It should be reviewed under the district's student-data process if the district requires that for online services. |
| "Is StrideOS FERPA compliant?" | Use careful language: StrideOS is built to support school privacy obligations, but the school or district makes the final compliance determination. |
| "Do athletes need accounts?" | The preferred school setup should allow coach-managed rosters without requiring student accounts. |
| "Why not a spreadsheet?" | A spreadsheet stores data. StrideOS interprets it for training pace, event fit, race projection, roster gaps, and team decisions. |
| "Why not a free calculator?" | Free calculators handle isolated inputs. StrideOS is for saved rosters, team reporting, season decisions, and coach workflow. |
| "Why is Team more than Pro?" | Team includes staff access, higher roster bands, shared team workflow, team reports, and program-level decision support. |

---

## 10. Website and checkout changes

Pricing page:

- Add a school-friendly CTA on Team Starter, Team Plus, and Program: **Request school invoice**.
- Keep normal card checkout for buyers who can pay immediately.
- Add a short line: "Schools can request a quote, W-9, and invoice for PO/check/ACH payment."

Invoice request form:

- Plan requested
- School/district name
- Campus/team name
- Coach name and email
- Billing contact name and email
- Phone number
- State
- Athlete count
- Coach seat count
- Preferred payment method: card, PO, check, ACH, unknown
- Need W-9: yes/no
- Need privacy/security review: yes/no/unknown
- Requested service start date
- Notes

Sales status fields:

```text
school_quote_requested
quote_sent
vendor_packet_sent
po_requested
po_received
invoice_sent
paid
workspace_activated
renewal_pending
renewed
closed_lost
```

Stripe setup:

- Use Stripe Checkout for card buyers.
- Use Stripe Invoicing or a manual invoice process for school PO/check/ACH buyers.
- Do not make Stripe Checkout the only path for Team/Program.
- Stripe product names should match school language, for example:
  - `StrideOS Team Starter - Annual School License - 1-25 Active Athletes`
  - `StrideOS Team Plus - Annual School License - 26-75 Active Athletes`
  - `StrideOS Program - Annual School License - 76-200 Active Athletes`

---

## 11. Implementation backlog

### Launch-ready

- Create vendor packet folder.
- Create W-9 once the legal/tax entity is final.
- Create quote template.
- Create invoice template.
- Create one-page privacy/security summary.
- Add "Request school invoice" CTA for Team/Program.
- Build invoice request form or simple email intake.
- Add school purchase status fields in admin/back office notes.
- Update Terms and Privacy with real support/contact email.

### Before wider school sales

- Decide student login policy for schools.
- Add coach-managed roster mode with no required athlete accounts.
- Add school/district entity fields to Team/Program subscriptions.
- Store `plan_code`, `athlete_cap`, `coach_seat_cap`, `billing_owner_type`, and `school_purchase_status`.
- Add data export and deletion request workflow.
- Create district review packet: privacy, security, subprocessors, accessibility, terms.
- Create renewal reminders at 90/60/30 days before expiration.

### Later

- Generate quotes and invoices from app/admin.
- Add PO upload.
- Add ACH instructions.
- Add signed order form.
- Add district-wide licensing.
- Add state-specific procurement notes only after verifying them.

---

## 12. Script for coaches

The coach should not lead with:

> Can I buy this app?

Better:

> I want to purchase an annual team software license for our track/cross-country program. What is the correct school process, and what vendor packet do you need?

That framing makes it sound like a normal school purchase, not a personal app subscription.

---

## 13. Source anchors

These are reference anchors for the school-purchasing packet. They do not replace district legal review.

- U.S. Department of Education Student Privacy Policy Office, "Protecting Student Privacy While Using Online Educational Services: Requirements and Best Practices": https://studentprivacy.ed.gov/resources/protecting-student-privacy-while-using-online-educational-services-requirements-and-best
- IRS Form W-9 page: https://www.irs.gov/forms-pubs/about-form-w-9
- FERPA regulation reference, 34 CFR Part 99, where applicable: https://www.ecfr.gov/current/title-34/subtitle-A/part-99

