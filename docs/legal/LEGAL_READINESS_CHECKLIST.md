# STRIDE OS Legal Comfort Checklist

**Status:** Practical launch-readiness checklist, not legal advice.
**Last updated:** July 2, 2026

---

## Done in this pass

- Added public, linkable pages:
  - `/terms.html`
  - `/privacy.html`
- Added explicit signup consent in `index.html` before account creation:
  - Terms acceptance.
  - Privacy Policy acceptance.
  - Coach authority to enter athlete data.
  - Parent/guardian permission or school/district authorization where legally permitted for athletes under 13.
- Prevented magic-link sign-in from silently creating a new account without the signup consent checkbox.
- Added school/vendor review docs:
  - `docs/legal/STUDENT_DATA_PRIVACY_SUMMARY.md`
  - `docs/legal/SUBPROCESSORS.md`
  - `docs/legal/UNIQUE_VALUE_ONE_PAGER.md`
  - `docs/legal/LEGAL_REVIEW_QUESTIONS_FOR_ATTORNEY.md`
- Replaced the public support placeholder with `thelabstrength@gmail.com`.
- Kept compliance language careful: "built to support school privacy review" instead of claiming blanket FERPA/COPPA compliance.

## Current comfort level

Good enough for:

- Beta users.
- First paid coach checkout.
- A lightweight school/team conversation where the buyer only needs the basic privacy posture.
- Showing that the product has Terms/Privacy links, explicit account consent, data export/deletion, and subprocessor awareness.

Not enough yet for:

- District-wide procurement.
- A signed school data processing addendum.
- A full COPPA parental-consent program.
- A formal FERPA "school official" posture without school/district counsel review.
- Health, injury-risk, readiness, recovery, or medical-adjacent claims.

## Must do before broad school/district sales

1. Have counsel review Terms, Privacy, data deletion/export language, payment terms, and limitation-of-liability language.
2. Decide the legal entity name for Terms, Privacy, invoices, W-9, Stripe, and school agreements.
3. Finalize under-13/COPPA policy: allowed/not allowed, parent notice, consent record, parent deletion/review requests.
4. Prepare a school data processing addendum or student data privacy agreement template.
5. Finalize subprocessor notice/update process.
6. Add incident-response and breach-notification commitments only after counsel approves them.
7. Add accessibility statement or VPAT-lite roadmap if schools ask.
8. Confirm whether any state student privacy laws affect the first target states.
9. Remove or narrow any health/medical/readiness language that could be interpreted as diagnosis, treatment, injury prediction, or clinical guidance.
10. Make sure customer-facing claims about forecasting, paces, and lineup optimization are substantiated and framed as decision support.

## Product guardrails to preserve

- Do not sell athlete data.
- Do not run ads against athlete data.
- Do not train outside AI models on identifiable athlete data without explicit permission.
- Do not require student/athlete login for coach-managed roster use.
- Keep export and deletion available in the signed-in app.
- Keep subscription cancellation/payment management visible for paid users.
- Keep secrets in Supabase/Vercel environments, not browser code.

## Official references checked

- FTC COPPA FAQ: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- FTC 2025 COPPA Rule update summary: https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data
- U.S. Department of Education FERPA overview: https://studentprivacy.ed.gov/ferpa
- U.S. Department of Education online educational services model terms: https://studentprivacy.ed.gov/resources/protecting-student-privacy-while-using-online-educational-services-model-terms-service
- FTC Health Products Compliance Guidance: https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance
- FTC Advertising Substantiation Policy Statement: https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation
