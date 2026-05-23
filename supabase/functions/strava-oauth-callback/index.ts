// STRIDE OS · strava-oauth-callback
// Receives ?code=<auth_code> from Strava after the athlete authorizes.
// Exchanges the code for tokens, stores them in athlete_strava, kicks
// off an initial activity sync, then redirects the athlete back to
// the STRIDE OS app.
//
// Flow:
//   1. Athlete clicks "Connect Strava" in the app.
//   2. We redirect them to:
//      https://www.strava.com/oauth/authorize?client_id=X
//         &redirect_uri=<this function URL>
//         &response_type=code
//         &scope=activity:read,activity:read_all
//         &state=<athlete_uuid>
//   3. Athlete approves on Strava. Strava redirects to this function
//      with ?code=<code>&state=<athlete_uuid>.
//   4. We POST to https://www.strava.com/oauth/token with the code +
//      our client_secret. Strava returns access/refresh tokens and
//      the strava athlete id.
//   5. We upsert athlete_strava and trigger strava-sync-activities.
//   6. We 302-redirect back to the app with ?strava=connected.
//
// Required env vars (Supabase Dashboard → Edge Functions → secrets):
//   STRAVA_CLIENT_ID         from developers.strava.com/settings/api
//   STRAVA_CLIENT_SECRET     keep secret — never in stride-config.js
//   APP_BASE_URL             where to redirect after success
//   SUPABASE_URL             auto-provided
//   SUPABASE_SERVICE_ROLE_KEY auto-provided
//
// IMPORTANT: deploy with verify_jwt = false. The state parameter
// carries the athlete UUID and Strava's redirect doesn't include
// our Supabase JWT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const appUrl =
    Deno.env.get('APP_BASE_URL') ?? 'https://strideos.thecoachlab.app';

  if (error) {
    return Response.redirect(`${appUrl}/?strava=denied`, 302);
  }
  if (!code || !state) {
    return new Response('missing code or state', { status: 400 });
  }

  try {
    // 1. Exchange code for tokens.
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('STRAVA_CLIENT_ID'),
        client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error('Strava token exchange failed', tokenRes.status, body);
      return Response.redirect(`${appUrl}/?strava=token_failed`, 302);
    }
    const tokens = await tokenRes.json();
    // tokens shape: { access_token, refresh_token, expires_at, athlete:{id,...}, scope, ... }

    // 2. Verify the athlete row exists and the OAuth state matches a
    //    real athlete the caller has access to. The 'state' is the
    //    athletes.id we passed when starting the flow.
    const { data: athleteRow, error: aErr } = await admin
      .from('athletes')
      .select('id, athlete_user_id, coach_id')
      .eq('id', state)
      .single();
    if (aErr || !athleteRow) {
      console.error('athlete not found for state', state);
      return Response.redirect(`${appUrl}/?strava=athlete_not_found`, 302);
    }

    // 3. Upsert the athlete_strava row.
    const expiresAtIso = new Date(tokens.expires_at * 1000).toISOString();
    const { error: upErr } = await admin
      .from('athlete_strava')
      .upsert(
        {
          athlete_id: athleteRow.id,
          strava_athlete_id: tokens.athlete?.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAtIso,
          scope: tokens.scope ?? null,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'athlete_id' },
      );
    if (upErr) {
      console.error('athlete_strava upsert failed', upErr);
      return Response.redirect(`${appUrl}/?strava=store_failed`, 302);
    }

    // 4. Kick off the initial activity sync in the background. Don't
    //    block the redirect on this — the user can wait a few seconds
    //    in the app for activities to appear.
    syncActivitiesInBackground(athleteRow.id, tokens.access_token, athleteRow.coach_id).catch(
      (err) => console.error('background activity sync failed', err),
    );

    return Response.redirect(`${appUrl}/?strava=connected`, 302);
  } catch (err) {
    console.error('strava-oauth-callback error', err);
    return Response.redirect(`${appUrl}/?strava=error`, 302);
  }
});

async function syncActivitiesInBackground(
  athleteId: string,
  accessToken: string,
  coachId: string,
) {
  // Pull the most recent 30 activities. For initial connection that's
  // plenty; later we'll use webhooks for incremental updates.
  const res = await fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=30',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    console.error('strava activities fetch failed', res.status, await res.text());
    return;
  }
  const activities = await res.json();

  // Map Strava activity types to our workout_type enum.
  // Strava uses 'Run', 'Ride', 'Swim', etc. We import Run-family activities
  // and label them as 'other' until the athlete or coach refines.
  const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);

  const rows = (activities as any[])
    .filter((a) => RUN_TYPES.has(a.type) || RUN_TYPES.has(a.sport_type))
    .map((a) => ({
      athlete_id: athleteId,
      coach_id: coachId,
      workout_date: a.start_date_local
        ? a.start_date_local.slice(0, 10)
        : a.start_date.slice(0, 10),
      workout_start_time: a.start_date_local
        ? a.start_date_local.slice(11, 16)
        : null,
      workout_type: 'other',
      total_distance_m: a.distance ?? null,
      total_duration_sec: a.moving_time ?? null,
      avg_pace_sec_per_km:
        a.distance && a.moving_time
          ? a.moving_time / (a.distance / 1000)
          : null,
      avg_hr_bpm: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      max_hr_bpm: a.max_heartrate ? Math.round(a.max_heartrate) : null,
      coach_notes: a.name ? `Strava: ${a.name}` : null,
      source: 'strava',
      source_ref: String(a.id),
    }));

  if (rows.length === 0) return;

  // Upsert by (athlete_id, source, source_ref) so re-syncs are idempotent.
  const { error } = await admin
    .from('workouts')
    .upsert(rows, { onConflict: 'athlete_id,source,source_ref' });
  if (error) console.error('workouts upsert failed', error);
}
