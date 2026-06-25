# Deploy Steps — STRIDE OS Production

Last updated: 2026-06-22

These steps assume the active repo is:

```bash
cd "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS"
```

## 1. Preflight

```bash
bash fix-vercel.sh
```

Expected checks:

- prediction benchmark passes
- inline app script parses
- Supabase project ref resolves before backend flows are tested
- `git status -sb` shows only intentional changes

## 2. Supabase

```bash
supabase link --project-ref njadrabgodqpzpbgkkbs
supabase db push
supabase config push
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy create-checkout-session create-portal-session strava-oauth-callback strava-sync-activities
```

Auth URL configuration must include:

- `https://strideos.thecoachlab.app`
- `https://stride-os-gray.vercel.app`
- `http://localhost:8080`

## 3. Vercel

Commit and push the reviewed changes to `main`; Vercel redeploys from GitHub.

Verify both domains after deploy:

- `https://strideos.thecoachlab.app`
- `https://stride-os-gray.vercel.app`

The deployed `index.html` should match the current local app, not the stale June 11 build.

## 4. Smoke Test

- Create/sign in to a coach account.
- Save an athlete and confirm the save message says synced, not local-only.
- Refresh on another browser and confirm the athlete appears.
- Open Race Forecasts and confirm ranges are labeled planning ranges.
- Log a workout and confirm it reloads.
- If Strava is configured, connect a test athlete and confirm `athlete_strava_status` works without exposing token columns.
- Start Stripe checkout in test mode, return successfully, and confirm `my_subscription.has_pro_access = true`.

## Current Feature State

Implemented:

- Supabase auth and coach profiles
- subscriptions/trial/pro gating
- workouts table and UI
- Strava OAuth/sync scaffolding
- prediction snapshot logging
- source-excluded race forecasts

Still needs separate production validation:

- live Supabase DNS/project-ref health after resume
- Stripe webhook event replay/idempotency test
- Strava OAuth with real app credentials
- browser QA on both production domains
