# STRIDE OS — Engineering Handoff

**Date:** 2026-05-29 · **Pass:** Full-codebase audit + P0 fix + documentation

---

## 1. Executive summary

StrideOS was audited end-to-end (frontend, Supabase backend, RLS, billing, Strava, security, performance). Contrary to a "broken app" assumption, the codebase is **well-built and mostly correct**: the inline JS parses cleanly, every DB call resolves, auth and Stripe flows are wired properly, and RLS is comprehensive. The audit found **one runtime-breaking bug — Strava import — which is now fixed** via a one-line-effect migration. Remaining items are a security hardening task (XSS), a product decision (team tier), and minor cleanup; all are documented with specific fixes. No working features were rewritten or risked.

## 2. What was broken

- **P0 — Strava import (connect + Sync Now) failed at runtime.** The workout upsert targeted a *partial* unique index, which PostgreSQL's `ON CONFLICT` cannot infer via PostgREST → `42P10` on every import. (See `BUGS.md` BUG-001.)

That was the only confirmed breakage. Everything else found is hardening, product, or cosmetic — not a break.

## 3. What was fixed

- **Strava import.** New migration `supabase/migrations/20260529173000_fix_workouts_upsert_unique_index.sql` replaces the partial index with a full unique index on `(athlete_id, source, source_ref)`. Root-cause fix; no edge-function changes required. NULL `source_ref` (coach manual entries) remain unaffected.

## 4. What was improved (documentation)

- `PROJECT_AUDIT.md` — full audit: architecture, checks run, findings, tech debt, prioritized roadmap.
- `BUGS.md` — actionable tracker with severity, location, cause, fix, and verification steps.
- `FINAL_HANDOFF.md` — this file.

## 5. Files changed

| File | Change |
|---|---|
| `supabase/migrations/20260529173000_fix_workouts_upsert_unique_index.sql` | **New** — P0 fix for Strava upsert |
| `PROJECT_AUDIT.md` | **New** — consolidated audit + tech debt + roadmap |
| `BUGS.md` | **New** — bug tracker |
| `FINAL_HANDOFF.md` | **New** — this handoff |

No existing application code was modified in this pass. (Pre-existing uncommitted edits to `index.html` and `create-checkout-session/index.ts` were left as-is; see §8.)

## 6. Tests / checks performed

No `package.json` exists — this is a static site, so npm build/lint/test do not apply. Adapted checks:

- `node --check` on the full extracted inline app (lines 668–6177): **pass, no syntax errors.**
- Static DOM analysis: **0 duplicate IDs**, all 32 inline handlers resolve to defined functions, dynamic-only `getElementById` targets confirmed created in JS.
- Schema cross-reference: **all 4 `.rpc()` and all 6 `.from()` targets exist** in migrations.
- Edge-function ↔ frontend contract review: auth headers and request bodies **match**.
- Migration SQL: trivial drop/create, reviewed; idempotent (`drop if exists` / `create … if not exists`).
- Bug behaviour verified against PostgreSQL + PostgREST docs and a matching Supabase issue.

## 7. Remaining issues

- **BUG-002 (P1) — XSS via `innerHTML`** of user-controlled text (Strava names, notes, athlete names). Specified, not applied.
- **BUG-003 (P2) — no distinct team tier** for `team_annual`. Product decision needed.
- **BUG-004 (P3)** — stray `console.log`s, loose `==`, README line-count drift, duplicated price/trial copy.

## 8. Blockers

- **No live database in the audit environment** (no Postgres binary, no root, package mirror lacks an embeddable Postgres). The P0 fix is verified by documentation, not by live repro. **Recommend applying the migration to a Supabase branch/staging first** and clicking through Strava connect + Sync Now to confirm before production.
- **No browser test loop**, which is why frontend hardening (XSS) is specified rather than applied — safe remediation of 45 render sites needs visual verification.
- **Deploy is owner-gated.** This pass did not run `supabase db push`, deploy functions, or commit to git. You hold those keys.

## 9. Recommended next steps (in order)

1. Apply `20260529173000_fix_workouts_upsert_unique_index.sql` to staging → test Strava → promote to prod.
2. Implement the `escapeHtml` hardening (BUG-002) with a browser open.
3. Commit the working tree; reconcile price/trial copy across files.
4. Stand up a minimal QA loop (checklist below, or a Playwright smoke test).
5. Resolve the team-tier model before broad `team_annual` sales.
6. Pre-launch performance pass (minify, cache headers, defer non-critical JS).

## 10. Product recommendations

The core coach loop (account → athlete → data → review) is sound in code. Before opening beta wider, prioritize: (a) trustworthy onboarding empty-states for a coach with zero athletes, (b) a clear "trial days remaining" surface tied to the existing `my_subscription.trial_seconds_remaining`, and (c) the team/program purchase path, since the checkout already offers it but the backend doesn't model it.

## 11. Technical recommendations

Introduce a test loop before any structural refactor of `index.html`. Once that exists, the highest-leverage refactor is extracting the inline JS into a few modules (auth, billing, predictions, rendering) — but not before, given there's no safety net today. Keep Stripe API version pinned and watch for the `invoice.subscription` field deprecation if you bump it.

## 12. Security notes

Good posture overall: no secrets client-side, RLS everywhere, service-role confined to edge functions, Stripe signature verification on the webhook. The one real gap is the `innerHTML` XSS surface (BUG-002) — treat as the top hardening task. CORS `*` is acceptable given JWT/Stripe-signature gating, but you may tighten `Access-Control-Allow-Origin` to your domains for defense-in-depth.

## 13. Performance notes

Single 331 KB unminified file is fine for closed beta. Before scale: minify/compress, split the inline script, add long-lived cache headers for the CDN libs (or self-host pinned versions), and lazy-load `xlsx`/`papaparse` (only needed on import).

## 14. Research notes

Confirmed the P0 root cause against authoritative sources: PostgreSQL requires the index predicate to infer a *partial* unique index in `ON CONFLICT`; PostgREST's `on_conflict` does not emit it — a known Supabase upsert gotcha. Sources: Supabase discussion #36532; "Why PostgreSQL's ON CONFLICT cannot find my partial unique index" (betakuang).

## 15. Next best tasks

`BUG-002` (XSS hardening) is the single highest-value next task — it's a real cross-user vector and the fix is well-scoped. After that, commit hygiene + the QA loop, which unblocks everything else safely.
