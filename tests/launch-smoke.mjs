import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

function assert(condition, message){
  if(!condition) throw new Error(message);
}

function extractInlineScripts(html){
  const scripts = [];
  const rx = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while((match = rx.exec(html))){
    if(/\bsrc\s*=/.test(match[1])) continue;
    scripts.push(match[2]);
  }
  return scripts;
}

const html = read('index.html');

assert(exists('terms.html'), 'terms.html must be tracked in the app root');
assert(exists('privacy.html'), 'privacy.html must be tracked in the app root');
assert(html.includes('href="/terms.html"'), 'signup flow must link Terms');
assert(html.includes('href="/privacy.html"'), 'signup flow must link Privacy Policy');
assert(html.includes('id="authLegalConsent"'), 'signup flow must require legal consent');

extractInlineScripts(html).forEach((script, index) => {
  try{
    new Function(script);
  }catch(err){
    throw new Error(`inline script ${index + 1} failed to parse: ${err.message}`);
  }
});

const idCounts = new Map();
for(const match of html.matchAll(/\bid="([^"]+)"/g)){
  idCounts.set(match[1], (idCounts.get(match[1]) || 0) + 1);
}
const duplicateIds = [...idCounts].filter(([, count]) => count > 1).map(([id]) => id);
assert(duplicateIds.length === 0, `duplicate static ids: ${duplicateIds.join(', ')}`);

const bootstrapPos = html.indexOf('async function bootstrapAuthenticatedSession()');
const invitePos = html.indexOf('handleAthleteInviteReturn()', bootstrapPos);
const coachProfilePos = html.indexOf('ensureCoachProfileSilent()', bootstrapPos);
assert(bootstrapPos >= 0, 'auth bootstrap helper must exist');
assert(invitePos > bootstrapPos, 'auth bootstrap must process athlete invites');
assert(coachProfilePos > invitePos, 'athlete invite must be processed before coach profile creation');
assert(html.includes("stride_account_role: 'athlete_invite'"), 'invite magic link must mark athlete-invite users');
assert(html.includes('shouldCreateUser: true'), 'athlete invite magic link must explicitly allow invited user creation');
assert(html.includes('function isAthleteOnly()'), 'athlete-only role helper must exist');
assert(html.includes('async function hydrateLinkedAthleteWorkspace()'), 'linked athlete workspace hydration must exist');
assert(html.includes('function athleteLegalAccepted()'), 'athlete Terms/Privacy gate must exist');
assert(html.includes('stride_athlete_terms_accepted_at'), 'athlete Terms acceptance must be persisted in auth metadata');
assert(html.includes('ensureAthleteLegalModal();'), 'athlete bootstrap must show the Terms/Privacy gate');
assert(html.includes("source: athleteOnly ? 'athlete_entry' : 'coach_entry'"), 'athlete workout writes must use athlete_entry source');
assert(html.includes('coach_id: coachId'), 'athlete workout writes must preserve the coach row id');
assert(html.includes('function canEditWorkoutEntry(workout)'), 'athlete workout edit guard must exist');

assert(!html.includes('Copy rows straight from Athletic.net'), 'import copy must not imply unrestricted Athletic.net copying');
assert(!html.includes('Copy straight from Athletic.net'), 'meet-result copy must not imply unrestricted Athletic.net copying');
assert(html.includes('source you are authorized to use'), 'import copy must mention authorized sources');

const racePolicy = read('supabase/migrations/20260702124500_allow_linked_athletes_read_races.sql');
assert(racePolicy.includes('Athletes can read own race history'), 'linked-athlete race read policy must exist');
assert(racePolicy.includes('a.athlete_user_id = auth.uid()'), 'race read policy must scope to the linked athlete');

console.log('launch smoke ok');
