# STRIDE OS Subprocessor List

**Status:** Working list for customer/vendor review. Confirm before sending with a signed agreement.
**Last updated:** July 2, 2026
**Contact:** thelabstrength@gmail.com

---

| Provider | Purpose | Data categories | Notes |
| --- | --- | --- | --- |
| Supabase | Database, authentication, Edge Functions, app backend | Coach account data, athlete roster/performance/training data, subscription/customer IDs, logs | Primary application backend. Access should be controlled by row-level security and server-side functions. |
| Vercel | Web hosting, deployment, delivery, edge/runtime logs | Website/app requests, IP address, browser/device metadata, operational logs | Hosts the public STRIDE OS web app and production domain. |
| Stripe | Checkout, subscriptions, invoices, customer portal, payment records | Customer/contact info, billing plan/status, payment metadata; Stripe handles payment card data | STRIDE OS should not store raw card data. |
| Meta Platforms | Advertising pixel on the public marketing pages (ad measurement for STRIDE OS's own promotion) | Signed-out visitor events only (page view, signup started, checkout started) with IP/browser metadata via cookie | Loads only when no coach session exists; disabled inside the coach workspace; never receives roster, athlete, or performance data. |

## Not currently in the core list

- No ad network is part of the core product (coach workspace). The Meta pixel above is marketing-page measurement only, per the scoping in its row.
- No outside AI model provider should receive identifiable athlete data without explicit permission and a documented product change.
- No school/student analytics vendor should be added without updating this list and the Privacy Policy.

## Change process

Before adding a new subprocessor that can access coach or athlete data:

1. Confirm why the provider is needed.
2. Confirm what data categories it will receive.
3. Review its security/privacy terms.
4. Update this file and the Privacy Policy if needed.
5. Notify affected school/team customers if a written agreement requires notice.
