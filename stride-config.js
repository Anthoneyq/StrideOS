// Public Supabase + integration browser config for the static STRIDE OS app.
// All values here are PUBLISHABLE — never put secret keys in this file.
// (Supabase anon key is safe with RLS. Strava client_id is publishable;
// the client_secret lives only in Supabase Edge Function env vars.)

window.STRIDE_SUPABASE = {
  url: 'https://uvjrflkzgulxwrlrqowp.supabase.co',
  anonKey: 'sb_publishable_yFfdOo1goFYr72jagC2YIw_hU5w59JG',
};

// Strava integration. Paste your client_id after registering the app at
// https://developers.strava.com/. Leave as null until then — the "Connect
// Strava" button reads this and hides itself if missing.
window.STRIDE_STRAVA = {
  clientId: null, // e.g. '123456'
  redirectUri: 'https://uvjrflkzgulxwrlrqowp.supabase.co/functions/v1/strava-oauth-callback',
  scope: 'read,activity:read_all',
};
