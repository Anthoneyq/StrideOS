# STRIDE OS Supabase Setup

This repo now has the backend foundation under `supabase/`.

## 1. Apply the schema

Recommended path:

```bash
cd "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS"
supabase login
supabase link --project-ref njadrabgodqpzpbgkkbs
supabase db push
supabase config push
```

Dashboard fallback if the CLI is unavailable:

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Run every file in `supabase/migrations/` in timestamp order, not only the initial schema. The later migrations add subscriptions, workouts, Strava, prediction logs, and production hardening.

## 2. Configure auth URLs

In Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `https://strideos.thecoachlab.app`.
- Redirect URLs: `https://strideos.thecoachlab.app`, `https://stride-os-gray.vercel.app`, and local development URLs you use.

Enable email/password and magic links for v1.

## 3. Connect the static app

Because STRIDE OS is currently a plain static `index.html`, Vercel environment variables are not automatically injected into browser code.

Put your public Supabase values in `stride-config.js`:

```js
window.STRIDE_SUPABASE = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

The anon key is public by design. Security comes from Row Level Security policies in the database.

Do not put `SUPABASE_SERVICE_ROLE_KEY` in `stride-config.js`, `index.html`, or any browser-delivered file.

## 4. Connect Vercel

Project dashboard:

```text
https://vercel.com/anthoneyqs-projects/stride-os
```

Once you know the production domain, add it to Supabase Auth URL Configuration.

## 5. What the schema includes

- `coaches`: one profile per Supabase Auth user.
- `athletes`: coach-owned athletes, with the current STRIDE OS local fields mapped.
- `races`: primary race result plus additional PRs.
- `daily_checkins`: future optional readiness/training data.
- `predictions`: forecast logs for later accuracy tracking.
- `prediction_log`: source-excluded forecast snapshots for later calibration.
- `workouts`: coach/athlete/Strava workout history.
- `athlete_strava_status`: tokenless browser-safe Strava connection status.
- `validation_corpus`: locked down by default for benchmark CSV imports.
- `local_imports`: raw localStorage snapshots so imported beta data is not lost.
- RLS policies: coaches can only read/write their own data.

## 6. Import existing browser data

The current frontend stores data under `localStorage.strideOS_v5`. The sidebar account panel can now:

1. Send a magic link.
2. Create/update the coach profile.
3. Import the current local roster into Supabase.

Equivalent calls:

```js
await supabase.rpc("upsert_coach_profile", {
  display_name: "Coach Name",
  team_name: "Team Name",
  team_color: "#ff4500",
  terms_accepted: true,
  privacy_accepted: true,
  research_opt_in: false
});

await supabase.rpc("import_local_storage", {
  payload: JSON.parse(localStorage.getItem("strideOS_v5")),
  source_key: "strideOS_v5"
});
```

That stores the raw snapshot, creates/upserts athletes, and turns the primary race plus additional PRs into rows in `races`.

## 7. Next frontend wiring

The app now has the first static Supabase bridge. Remaining production work:

- Keep `stride-config.js` aligned with the active Supabase project ref.
- Keep both production domains in Supabase Auth redirects.
- Redeploy Vercel after local changes land on `main`; the public site can otherwise serve a stale cached build.
- Decide whether to keep static HTML or convert to a build-based app for cleaner env handling.
- Expand account settings for data export and account deletion.
- Add CSV import tooling for validation corpus data.
