// STRIDE OS · strava-sync-activities
// Manual / on-demand sync of recent Strava activities for one athlete.
// Used by the "Sync Now" button in the app + as a fallback for athletes
// who don't get webhook-driven syncs.
//
// Request body: { athlete_id: "uuid" }
// Response:     { imported: number }
//
// Auth: the caller must be signed in. We verify the caller is either
// the coach who owns the athlete, or the linked athlete themselves.
// Token refresh against Strava is handled here transparently.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'missing Authorization' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: 'not signed in' }, 401);

    const body = await req.json().catch(() => ({}));
    const athleteId = body?.athlete_id;
    if (!athleteId) return json({ error: 'athlete_id required' }, 400);

    // Verify caller has access to this athlete.
    const { data: athlete } = await admin
      .from('athletes')
      .select('id, coach_id, athlete_user_id')
      .eq('id', athleteId)
      .single();
    if (!athlete) return json({ error: 'athlete not found' }, 404);
    if (athlete.coach_id !== user.id && athlete.athlete_user_id !== user.id) {
      return json({ error: 'not authorized for this athlete' }, 403);
    }

    // Load + refresh Strava tokens if needed.
    const { data: strava } = await admin
      .from('athlete_strava')
      .select('*')
      .eq('athlete_id', athleteId)
      .maybeSingle();
    if (!strava) {
      return json({ error: 'athlete has not connected Strava' }, 400);
    }

    let accessToken = strava.access_token;
    const expiresAt = new Date(strava.expires_at).getTime();
    if (expiresAt - Date.now() < 60_000) {
      // Token expired (or about to). Refresh.
      const refreshRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Deno.env.get('STRAVA_CLIENT_ID'),
          client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
          grant_type: 'refresh_token',
          refresh_token: strava.refresh_token,
        }),
      });
      if (!refreshRes.ok) {
        const txt = await refreshRes.text();
        console.error('refresh failed', txt);
        return json({ error: 'strava token refresh failed' }, 502);
      }
      const newTokens = await refreshRes.json();
      accessToken = newTokens.access_token;
      await admin
        .from('athlete_strava')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
        })
        .eq('athlete_id', athleteId);
    }

    // Fetch the 30 most recent activities.
    const actRes = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=30',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!actRes.ok) {
      return json(
        { error: 'strava activities fetch failed', status: actRes.status },
        502,
      );
    }
    const activities = await actRes.json();

    const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);
    const rows = (activities as any[])
      .filter(
        (a) => RUN_TYPES.has(a.type) || RUN_TYPES.has(a.sport_type),
      )
      .map((a) => ({
        athlete_id: athlete.id,
        coach_id: athlete.coach_id,
        workout_date: (a.start_date_local || a.start_date).slice(0, 10),
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

    if (rows.length === 0) {
      await admin
        .from('athlete_strava')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('athlete_id', athleteId);
      return json({ imported: 0 });
    }

    const { error: upErr, count } = await admin
      .from('workouts')
      .upsert(rows, { onConflict: 'athlete_id,source,source_ref', count: 'exact' });
    if (upErr) {
      console.error('workouts upsert failed', upErr);
      return json({ error: 'workouts upsert failed' }, 500);
    }

    await admin
      .from('athlete_strava')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('athlete_id', athleteId);

    return json({ imported: count ?? rows.length });
  } catch (err) {
    console.error('strava-sync-activities error', err);
    return json({ error: (err as Error).message ?? 'unknown' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
