# STRIDE OS Student Data Privacy Summary

**Status:** Operational summary for school/team review. Not legal advice. Attorney review recommended before district-level procurement.
**Last updated:** July 2, 2026
**Contact:** thelabstrength@gmail.com

---

## One-paragraph posture

STRIDE OS is built to support a school or team's student-data privacy process. Coaches use it to store athlete roster, performance, and training information so they can calculate paces, organize training groups, evaluate event fit, and manage coach workflows. STRIDE OS does not sell athlete data, does not run ads, does not require student accounts for coach-managed roster use, and supports coach data export and account deletion. Final compliance review belongs to the school, district, or organization using the service.

## What STRIDE OS collects

- Coach account information: email, display name, team name, authentication metadata.
- Athlete roster information: name or identifier, age, grade, sex, event focus, roster status.
- Performance and training information: race times, race dates, workouts, coach notes, imports, forecasts, training groups.
- Billing information: Stripe customer/subscription identifiers and plan status; Stripe handles card/payment details.
- Technical information: IP address, browser/device metadata, logs, error diagnostics.

## What STRIDE OS does not do

- Does not sell athlete data.
- Does not run ads or target ads to athletes.
- Does not train outside AI models on identifiable athlete data without explicit permission.
- Does not require athlete/student login for coach-managed roster use.
- Does not collect grades, transcripts, medical records, or clinical health records as a required product workflow.
- Does not claim blanket "FERPA compliant" status without school/district review and any required agreement.

## Access model

- Roster data is tied to the signed-in coach/workspace.
- Other public users cannot view a coach's roster.
- School/team sharing should be limited to authorized staff in the same workspace.
- Coaches are responsible for entering only athlete data they are authorized to store and use.

## Under-13 posture

STRIDE OS is intended for coaches and authorized adults, not direct child use. Before entering personal information for an athlete under 13, the coach must have parent/guardian permission or school/district authorization where legally permitted. Parent/guardian review or deletion requests should be sent to the support contact and may need to be verified with the coach, team, or school.

## Export and deletion

Signed-in coaches can open **Data & privacy** in the app to export account data as JSON or request account deletion. Account deletion removes the coach profile and associated athlete data from active use. Some records may remain temporarily in backups, logs, or legally required billing/accounting records before they age out.

## Core subprocessors

Current core subprocessors are:

- Supabase: database, authentication, Edge Functions, storage of coach and athlete application data.
- Vercel: hosting and delivery of the web app.
- Stripe: checkout, subscription billing, invoices, payment records, customer portal.

See `docs/legal/SUBPROCESSORS.md` for the working list.

## Security controls in place

- HTTPS-only browser access.
- Supabase authentication.
- Row-level security and account-scoped database access patterns.
- Server-side functions for billing and sensitive operations.
- Data export and deletion workflows.
- Secrets stored in Supabase/Vercel environments, not in browser code.

## Open items before broad district sales

- Attorney-reviewed Terms, Privacy Policy, DPA/student-data addendum, and governing-law language.
- Final under-13/COPPA workflow and parent notice/consent language.
- Written incident-response contact and timeline.
- Accessibility statement or VPAT-lite roadmap.
- Insurance certificate, if requested by districts.
- Entity/tax documents, W-9, quote, and invoice templates.
