import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function between(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0, `missing start marker: ${start}`);
  assert.ok(to > from, `missing end marker after: ${end}`);
  return html.slice(from, to);
}

const primaryNav = between('<nav id="primaryNav">', '</nav>');
const contextNav = between('id="athleteContextNav"', '<!-- HOME / FRONT DOOR');
const appFooter = between('<footer class="app-footer">', '</footer>');
const workspaceIds = between('const WORKSPACE_SCREEN_IDS', 'const ATHLETE_SCREEN_IDS');

for (const route of ['overview', 'roster', 'eventfit']) {
  assert.match(primaryNav, new RegExp(`data-s="${route}"`), `${route} must remain primary`);
}

for (const route of ['brief', 'xc', 'import', 'squads', 'lineup', 'predict', 'multievent', 'profile', 'workouts', 'proof', 'methodology', 'raceshape', 'edit']) {
  assert.doesNotMatch(primaryNav, new RegExp(`data-s="${route}"`), `${route} must be contextual`);
}

assert.match(primaryNav, /class="public-only"[^>]*><button class="nav-btn" data-s="home"/);
assert.match(primaryNav, /class="public-only"[^>]*><button class="nav-btn" data-s="paces"/);

assert.match(contextNav, /1 · Performance Curve/);
assert.match(contextNav, /2 · Race Forecasts/);
assert.match(contextNav, /Training Paces/);
assert.match(contextNav, /Training Log/);
assert.match(contextNav, /Event Demands/);

// The per-athlete tools exist ONLY in this bar (see the doesNotMatch block
// above), so the bar has to be visible wherever a coach works with a selected
// athlete. Gating it on an allow-list of athlete screens hid every route to
// those tools from Team IQ, Roster, and Compare — the screens a coach starts
// on — so a tool was only reachable from a tool you were already in.
assert.match(html, /const NO_ATHLETE_CONTEXT_SCREEN_IDS = new Set\(/,
  'context-bar visibility is a deny-list, not an allow-list of athlete screens');
assert.doesNotMatch(html, /(?<!NO_)ATHLETE_CONTEXT_SCREEN_IDS\.has\(screenId\)/,
  'the old allow-list gate is gone');
for (const screen of ['overview', 'roster', 'compare']) {
  assert.doesNotMatch(
    html.slice(html.indexOf('const NO_ATHLETE_CONTEXT_SCREEN_IDS'), html.indexOf('function pendingAthleteInviteId')),
    new RegExp(`'${screen}'`),
    `${screen} must keep the athlete-context bar — its tools are reachable nowhere else`);
}

assert.match(appFooter, /Sources &amp; Methodology/);
assert.match(appFooter, /href="\/terms\.html"/);
assert.match(appFooter, /href="\/privacy\.html"/);
assert.doesNotMatch(workspaceIds, /'methodology'/, 'Sources must remain public from the footer');

assert.match(html, /if\(currentScreen === 'home'\)\{\s*goTo\('overview', null\);/);
assert.match(html, /function switchAthlete\(id\)[\s\S]*?goTo\(athleteDecisionScreen\(A\),null\);/);
assert.match(html, /function athleteDecisionScreen\(athlete\)/);
assert.doesNotMatch(html, /Event <em>Profile<\/em>/);
assert.match(html, /onclick="goTo\('xc',null\)"[^>]*>[\s\S]*?Race Command →/,
  'Team IQ exposes the contextual race-planning route');
assert.match(workspaceIds, /'xc'/, 'Race Command belongs to the authenticated workspace');

console.log('navigation flow probes ok — 33 assertions');
