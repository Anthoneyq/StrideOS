// Public Supabase + integration browser config for the static STRIDE OS app.
// All values here are PUBLISHABLE — never put secret keys in this file.
// (Supabase anon key is safe with RLS. Strava client_id is publishable;
// the client_secret lives only in Supabase Edge Function env vars.)

window.STRIDE_SUPABASE = {
  url: 'https://njadrabgodqpzpbgkkbs.supabase.co',
  anonKey: 'sb_publishable_DKBdmhRRqgVSVIVG9e76YA_N0Xk9QMP',
};

// Strava integration. Paste your client_id after registering the app at
// https://developers.strava.com/. Leave as null until then — the "Connect
// Strava" button reads this and hides itself if missing.
window.STRIDE_STRAVA = {
  clientId: null, // e.g. '123456'
  redirectUri: 'https://njadrabgodqpzpbgkkbs.supabase.co/functions/v1/strava-oauth-callback',
  scope: 'read,activity:read_all',
};

// Billing config for STRIDE OS Pro.
// - Leave payment links null if you are using the Supabase Edge Function
//   checkout flow.
// - Populate the payment links if you want a direct Stripe Payment Link
//   fallback or a lightweight launch path before the backend is live.
// Launch ladder (PRICING_STRATEGY.md, locked 2026-06-30):
//   Free Account $0 (≤3 active athletes) · Pro $19.99/mo or $199/yr (≤25)
//   Founding Coach $149/yr lifetime-locked, first 25 seats (≤25)
//   Team Starter $399/yr (1–25) · Team Plus $599/yr (26–75) · Program $999/yr (76–200) · Enterprise custom (200+)
window.STRIDE_BILLING = {
  monthlyLabel: '$19.99/mo',
  annualLabel: '$199/yr',
  foundingLabel: '$149/yr',
  monthlyPaymentLink: null,
  annualPaymentLink: null,
};
