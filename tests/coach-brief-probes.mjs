// Coach Brief contract probes.
//
// These are deliberately stricter than the first visual implementation. They
// define the source-truth, role, privacy, deterministic-output, and mobile
// contracts required before a roster-wide briefing can be treated as trusted.
//
// Run: node tests/coach-brief-probes.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const failures = [];
let passed = 0;

function check(condition, message){
  if(condition) passed++;
  else failures.push(message);
}

function extractBlock(source, startIdx, openChar, closeChar){
  let depth = 0;
  for(let i = startIdx; i < source.length; i++){
    if(source[i] === openChar) depth++;
    else if(source[i] === closeChar){
      depth--;
      if(depth === 0) return source.slice(startIdx, i + 1);
    }
  }
  throw new Error(`unbalanced ${openChar}${closeChar} block at ${startIdx}`);
}

function extractFn(name){
  const asyncSig = `async function ${name}(`;
  const syncSig = `function ${name}(`;
  const at = html.indexOf(asyncSig) >= 0 ? html.indexOf(asyncSig) : html.indexOf(syncSig);
  if(at < 0) throw new Error(`function ${name} not found`);
  const bodyStart = html.indexOf('{', at);
  return html.slice(at, bodyStart) + extractBlock(html, bodyStart, '{', '}');
}

function extractConst(name, open = '{', close = '}'){
  const sig = `const ${name} = ${open}`;
  const at = html.indexOf(sig);
  if(at < 0) throw new Error(`const ${name} not found`);
  const start = at + sig.length - 1;
  return `const ${name} = ${extractBlock(html, start, open, close)};`;
}

function extractSet(name){
  const sig = `const ${name} = new Set([`;
  const at = html.indexOf(sig);
  if(at < 0) throw new Error(`set ${name} not found`);
  const start = html.indexOf('[', at);
  return new Set(new Function(`return ${extractBlock(html, start, '[', ']')};`)());
}

// Source-text extractors for the signal layer's module-level constants, so the
// probes evaluate the SHIPPED thresholds rather than a copy that can drift.
function extractSetSrc(name){
  const sig = `const ${name} = new Set([`;
  const at = html.indexOf(sig);
  if(at < 0) throw new Error(`set ${name} not found`);
  const start = html.indexOf('[', at);
  return `const ${name} = new Set(${extractBlock(html, start, '[', ']')});`;
}

function extractConstLine(name){
  const at = html.indexOf(`const ${name} = `);
  if(at < 0) throw new Error(`const ${name} not found`);
  const end = html.indexOf('\n', at);
  return html.slice(at, end);
}

function shiftISO(iso, days){
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function stableJSON(value){
  return JSON.stringify(value);
}

// ── Pure Coach Brief calculations ──────────────────────────────────────────
let E = null;
try{
  const src = [
    extractConst('DIST'),
    extractFn('parseTime'),
    extractFn('collectAllPRs'),
    extractFn('coachBriefDateState'),
    extractFn('coachBriefSignalRanges'),
    extractSetSrc('BRIEF_EASY_TYPES'),
    extractConstLine('BRIEF_RACE_DELTA_PCT'),
    extractFn('computeRosterSignals'),
    extractFn('computeCoachBriefData'),
    'return { coachBriefDateState, coachBriefSignalRanges, computeRosterSignals, computeCoachBriefData };'
  ].join('\n');
  E = new Function(src)();
  passed++;
}catch(err){
  failures.push(`Coach Brief helpers must be extractable pure functions: ${err.message}`);
}

const today = '2026-07-29';
if(E){
  check(E.coachBriefDateState('', today) === 'unknown',
    'coachBriefDateState: missing date is unknown');
  check(E.coachBriefDateState('not-a-date', today) === 'unknown',
    'coachBriefDateState: invalid date is unknown');
  check(E.coachBriefDateState(shiftISO(today, 1), today) === 'future',
    'coachBriefDateState: tomorrow is future');
  check(E.coachBriefDateState(today, today) === 'fresh',
    'coachBriefDateState: same-day result is fresh');
  check(E.coachBriefDateState(shiftISO(today, -90), today) === 'fresh',
    'coachBriefDateState: exactly 90 days remains fresh');
  check(E.coachBriefDateState(shiftISO(today, -91), today) === 'stale',
    'coachBriefDateState: day 91 is stale');
  check(E.coachBriefDateState(shiftISO(today, -365), today) === 'stale',
    'coachBriefDateState: exactly 365 days remains stale');
  check(E.coachBriefDateState(shiftISO(today, -366), today) === 'expired',
    'coachBriefDateState: day 366 is expired');

  const alpha = {
    id: 'ath-a',
    name: 'Jordan Smith',
    raceDistance: '1600m',
    raceDistanceM: 1600,
    raceTime: '4:48',
    raceDate: shiftISO(today, -14),
    weeklyMileage: 31,
    additionalPRs: { '800m': '2:14' }
  };
  const bravo = {
    id: 'ath-b',
    name: 'Jordan Smith',
    raceDistance: '5K',
    raceDistanceM: 5000,
    raceTime: '17:55',
    raceDate: shiftISO(today, -120),
    weeklyMileage: null,
    additionalPRs: {}
  };
  const charlie = {
    id: 'ath-c',
    name: 'Casey',
    raceDistance: '3200m',
    raceDistanceM: 3200,
    raceTime: '10:42',
    raceDate: shiftISO(today, 1),
    weeklyMileage: 24,
    additionalPRs: {}
  };

  const ordered = E.computeCoachBriefData([alpha, bravo, charlie], today);
  const shuffled = E.computeCoachBriefData([charlie, alpha, bravo], today);
  check(stableJSON(ordered) === stableJSON(shuffled),
    'computeCoachBriefData: shuffled roster input produces byte-identical output');

  const duplicate = E.computeCoachBriefData([alpha, { ...alpha }], today);
  check(duplicate.counts && duplicate.counts.roster === 1,
    'computeCoachBriefData: duplicate stable athlete IDs count once');

  const sameName = E.computeCoachBriefData([alpha, { ...alpha, id:'ath-z' }], today);
  check(sameName.counts && sameName.counts.roster === 2,
    'computeCoachBriefData: same-name athletes with different IDs remain distinct');

  const allowedKinds = new Set([
    'data_quality',
    'result_review',
    'context_review',
    'roster_coverage'
  ]);
  const kinds = (ordered.priorities || []).map(item => item && item.kind);
  check(kinds.length > 0 && kinds.every(kind => allowedKinds.has(kind)),
    'computeCoachBriefData: every action has an allowed non-medical kind');

  const renderedContract = stableJSON(ordered);
  const unsafeLanguage =
    /\b(?:fatigu\w*|injur\w*|medical|readiness|recover\w*|overtrain\w*|diagnos\w*|prescri\w*)\b|modify\s+(?:the\s+)?workout/i;
  check(!unsafeLanguage.test(renderedContract),
    'computeCoachBriefData: output contains no medical, readiness, fatigue, recovery, or prescription language');

  // The same contract, but against a POPULATED signal set. The check above
  // passes vacuously on a roster with no workouts and no dated history — which
  // is exactly the state that let the athlete-signal layer be written with
  // "readiness", "recovery" and "prescribed" in its copy. Every signal branch
  // is fired here so the language guard has something to bite on.
  const fireAll = E.computeCoachBriefData([
    { id:'q', name:'Quiet' },
    { id:'m', name:'Missing' },
    { id:'s', name:'Spiking' },
    { id:'e', name:'Effortful' },
    { id:'r', name:'Regressing', raceHistory:[
      { event:'800m', distM:800, sec:120, date:'2026-04-01' },
      { event:'800m', distM:800, sec:126, date:'2026-05-01' }] },
    { id:'p', name:'Progressing', raceHistory:[
      { event:'1600m', distM:1600, sec:300, date:'2026-04-01' },
      { event:'1600m', distM:1600, sec:288, date:'2026-05-01' }] }
  ], today, [
    { athlete_id:'q', workout_date:shiftISO(today,-20), workout_type:'easy', total_distance_m:8000 },
    { athlete_id:'m', workout_date:shiftISO(today,-1), workout_type:'tempo', prescribed_distance_m:6000 },
    { athlete_id:'m', workout_date:shiftISO(today,-2), workout_type:'tempo', prescribed_distance_m:6000 },
    { athlete_id:'s', workout_date:shiftISO(today,-10), workout_type:'easy', total_distance_m:20000 },
    { athlete_id:'s', workout_date:shiftISO(today,-2), workout_type:'easy', total_distance_m:45000 },
    { athlete_id:'e', workout_date:shiftISO(today,-1), workout_type:'recovery', total_distance_m:5000, perceived_effort:9 },
    { athlete_id:'e', workout_date:shiftISO(today,-3), workout_type:'recovery', total_distance_m:5000, perceived_effort:9 }
  ]);
  const firedKeys = new Set((fireAll.signals || []).map(s => s.key));
  check(['quiet','missed','load-spike','effort','slower','faster'].every(k => firedKeys.has(k)),
    'signal contract fixture fires every signal branch');
  check(!unsafeLanguage.test(stableJSON(fireAll.signals)),
    'athlete signals: populated output contains no medical, readiness, fatigue, recovery, or prescription language');
  // Athlete-state claims must stay observational — no causal verbs about why.
  check(!/\b(?:because|due to|caused by|means that|indicates|suggests)\b/i.test(
    stableJSON(fireAll.signals)),
    'athlete signals: no causal or interpretive claims about why a number moved');
}

// Prescribed group sessions are future/planned rows until completion evidence
// exists. They must never inflate the Coach Brief's completed-session totals.
try{
  const summarize = new Function(`${extractFn('summarizeCoachBriefWorkouts')}; return summarizeCoachBriefWorkouts;`)();
  const ranges = {
    completed:{ start:'2026-07-20', end:'2026-07-26' },
    previous:{ start:'2026-07-13', end:'2026-07-19' }
  };
  const summary = summarize([
    {
      athlete_id:'ath-a', workout_date:'2026-07-21', workout_type:'threshold',
      prescribed_distance_m:5000, prescribed_zone_label:'Threshold 93%',
      prescribed_notes:'5 × 1000m', total_distance_m:null, total_duration_sec:null
    },
    {
      athlete_id:'ath-b', workout_date:'2026-07-22', workout_type:'easy',
      total_distance_m:8000, total_duration_sec:2400
    }
  ], ranges);
  check(summary.completed.sessions === 1,
    'Coach Brief counts only entries with completion distance/duration');
  check(summary.completed.planned === 1,
    'Coach Brief reports prescribed rows that lack completion evidence');
  check(summary.completed.athletesLogged === 1,
    'planned-only athletes do not inflate completed athlete coverage');
  check(summary.completed.distanceM === 8000,
    'prescribed quality volume does not inflate completed distance');
}catch(err){
  failures.push(`Coach Brief planned/completed summary must execute: ${err.message}`);
}

// ── Role and source-truth contracts ────────────────────────────────────────
let workspaceScreens = null;
let athleteScreens = null;
try{
  workspaceScreens = extractSet('WORKSPACE_SCREEN_IDS');
  athleteScreens = extractSet('ATHLETE_SCREEN_IDS');
}catch(err){
  failures.push(`Coach Brief route sets must be extractable: ${err.message}`);
}
if(workspaceScreens && athleteScreens){
  check(workspaceScreens.has('brief'),
    'Coach Brief route belongs to the authenticated workspace');
  check(!athleteScreens.has('brief'),
    'Coach Brief route is excluded from athlete-only routes');
}
check(/<section\s+id="brief"[^>]*data-coach-scope="coach"/i.test(html),
  'Coach Brief section is explicitly coach-scoped');

let briefRegion = '';
const briefStart = html.indexOf('// ── WEEKLY COACH BRIEF');
const briefEnd = html.indexOf('// ── RENDER OVERVIEW', briefStart);
if(briefStart >= 0){
  briefRegion = html.slice(briefStart, briefEnd > briefStart ? briefEnd : html.length);
}else{
  failures.push('Coach Brief implementation region must exist');
}

let renderBriefSource = '';
let contextSource = '';
let applyMeetSource = '';
try{ renderBriefSource = extractFn('renderCoachBrief'); }
catch(err){ failures.push(err.message); }
try{ contextSource = extractFn('coachBriefContext'); }
catch(err){ failures.push(err.message); }
try{ applyMeetSource = extractFn('applyMeetResults'); }
catch(err){ failures.push(err.message); }

check(/(?:coachBrief|brief|roster)\w*State/i.test(briefRegion),
  'Coach Brief declares an explicit roster/source state value');
for(const state of ['loading', 'unavailable', 'empty']){
  check(new RegExp(`['"]${state}['"]`, 'i').test(briefRegion),
    `Coach Brief source declares distinct "${state}" state`);
  check(new RegExp(`['"]${state}['"]`, 'i').test(renderBriefSource),
    `renderCoachBrief handles the "${state}" state explicitly`);
}

check(/lastMeetSummary/.test(contextSource),
  'coachBriefContext reads lastMeetSummary');
check(/ownerId/.test(contextSource) && /sbUser\.id/.test(contextSource) && /===/.test(contextSource),
  'coachBriefContext accepts lastMeetSummary only when ownerId matches sbUser.id');
check(/lastMeetSummary/.test(applyMeetSource) && /ownerId\s*:/.test(applyMeetSource) && /sbUser\.id/.test(applyMeetSource),
  'applyMeetResults stamps lastMeetSummary with the authenticated owner ID');

check(/^async function applyMeetResults\(/.test(applyMeetSource),
  'applyMeetResults is async');
const directAwait = /await\s+syncAthleteToSupabase\s*\(/.exec(applyMeetSource);
const batchAwait = /await\s+Promise\.all\s*\(/.exec(applyMeetSource);
const syncCall = /syncAthleteToSupabase\s*\(/.exec(applyMeetSource);
const awaitedSync = directAwait || (batchAwait && syncCall);
check(Boolean(awaitedSync),
  'applyMeetResults awaits every athlete cloud sync before reporting applied');
const awaitAt = awaitedSync ? awaitedSync.index : -1;
const summaryAt = applyMeetSource.indexOf('lastMeetSummary');
check(awaitAt >= 0 && summaryAt > awaitAt,
  'applyMeetResults records lastMeetSummary only after awaited cloud sync');

// ── Mobile navigation and touch contracts ─────────────────────────────────
const buttonTags = [...html.matchAll(/<button\b[^>]*>/gi)].map(match => match[0]);
const mobileNavToggle = buttonTags.find(tag =>
  /mobile/i.test(tag) && /nav|menu/i.test(tag)
);
check(Boolean(mobileNavToggle),
  'Mobile layout provides a dedicated navigation drawer toggle button');
check(Boolean(mobileNavToggle && /\baria-controls="[^"]+"/i.test(mobileNavToggle)),
  'Mobile navigation toggle declares aria-controls');
check(Boolean(mobileNavToggle && /\baria-expanded="(?:true|false)"/i.test(mobileNavToggle)),
  'Mobile navigation toggle declares aria-expanded');
if(mobileNavToggle){
  const controls = mobileNavToggle.match(/\baria-controls="([^"]+)"/i);
  check(Boolean(controls && new RegExp(`\\bid="${controls[1]}"`).test(html)),
    'Mobile navigation aria-controls points to a real drawer element');
}

const mobileDrawerRule =
  /@media[^{]*(?:43\.75rem|48rem|700px)[^{]*\{[\s\S]*?\.sidebar[^{]*\{[^}]*position\s*:\s*fixed[^}]*transform\s*:\s*translateX/i;
check(mobileDrawerRule.test(html),
  'Phone CSS turns the sidebar into an off-canvas fixed drawer');
check(/(?:mobile|nav)[-_]?open[\s\S]{0,240}transform\s*:\s*translateX\s*\(\s*0\s*\)|\.sidebar\.(?:open|active)[^{]*\{[^}]*transform\s*:\s*translateX\s*\(\s*0\s*\)/i.test(html),
  'Phone CSS has an explicit open state for the navigation drawer');

const hitTarget = '(?:44px|2\\.75rem)';
check(new RegExp(`\\.nav-btn[^{}]*\\{[^}]*min-height\\s*:\\s*${hitTarget}`, 'i').test(html),
  'Navigation buttons have a minimum 44px touch target');
check(new RegExp(`\\.(?:btn|brief-action)[^{}]*\\{[^}]*min-height\\s*:\\s*${hitTarget}`, 'i').test(html),
  'Coach Brief action controls have a minimum 44px touch target');

// ── ATHLETE SIGNAL LAYER ───────────────────────────────────────────────────
// The contract: the brief leads with what CHANGED on the roster, every line is
// an observation of recorded data, and nothing is claimed that the data model
// cannot support. These probes are the guard against the layer quietly
// regressing into a second data-hygiene list.
if(E){
  const T = '2026-08-11';
  const day = n => shiftISO(T, n);
  const sig = (athletes, workouts) => E.computeRosterSignals(athletes, workouts, T);
  const keys = out => out.map(s => s.key);
  const wk = (athlete_id, date, extra = {}) => ({
    athlete_id, workout_date: date, workout_type: 'easy',
    total_distance_m: 8000, total_duration_sec: 2400, ...extra
  });

  // Windows
  const R = E.coachBriefSignalRanges(T);
  check(R.today === T, 'signal ranges: today is the supplied date');
  check(R.week === day(-6), 'signal ranges: week window is the last 7 days inclusive');
  check(R.quiet === day(-9), 'signal ranges: quiet threshold is 10 days');
  check(R.window === day(-27), 'signal ranges: lookback window is 28 days');

  // Degenerate input never throws and never invents a signal.
  check(stableJSON(sig([], [])) === '[]', 'signals: empty roster yields no signals');
  check(stableJSON(sig([{id:'a', name:'A'}], null)) === '[]',
    'signals: roster with no races and no workouts yields no signals');
  check(stableJSON(sig([{id:'a', name:'A', raceHistory:[]}], undefined)) === '[]',
    'signals: null/undefined workout input is tolerated');

  // 1. Gone quiet — logged in the window, silent for 10+ days.
  const quiet = sig([{id:'a', name:'Quiet Kid'}], [wk('a', day(-20)), wk('a', day(-14))]);
  check(keys(quiet).includes('quiet'), 'signals: 14-day logging gap raises the quiet signal');
  const quietSig = quiet.find(s => s.key === 'quiet') || { names:[], detail:'' };
  check(quietSig.names[0] === 'Quiet Kid', 'signals: quiet signal names the athlete');
  check(/does not mean they did not train/i.test(quietSig.detail),
    'signals: quiet signal states the training-log limit rather than asserting inactivity');
  check(!keys(sig([{id:'a', name:'A'}], [wk('a', day(-3))])).includes('quiet'),
    'signals: a session 3 days ago is not a quiet athlete');
  check(!keys(sig([{id:'a', name:'A'}], [wk('a', day(-9))])).includes('quiet'),
    'signals: exactly 9 days stays inside the window');

  // A never-logged athlete is a data gap, not an athlete-state signal.
  check(!keys(sig([{id:'a', name:'Never'}], [])).includes('quiet'),
    'signals: an athlete who never logged is left to the roster-inputs list');

  // 2. Prescribed but unrecorded.
  const prescribed = d => wk('a', d, { total_distance_m:null, total_duration_sec:null,
    prescribed_distance_m: 6000 });
  const missed = sig([{id:'a', name:'A'}], [prescribed(day(-1)), prescribed(day(-2))]);
  check(keys(missed).includes('missed'), 'signals: two unrecorded prescriptions raise the missed signal');
  check(!keys(sig([{id:'a', name:'A'}], [prescribed(day(-1))])).includes('missed'),
    'signals: a single unrecorded prescription is below threshold');
  check(/may have happened and gone unlogged/i.test(
    (missed.find(s => s.key === 'missed') || {}).detail || ''),
    'signals: missed signal does not assert the athlete skipped the session');

  // 3. Week-over-week recorded distance jump.
  const spike = sig([{id:'a', name:'A'}], [
    wk('a', day(-10), { total_distance_m: 20000 }),
    wk('a', day(-2),  { total_distance_m: 40000 })
  ]);
  check(keys(spike).includes('load-spike'), 'signals: 100% distance jump raises the load signal');
  check(/does not judge whether it was too much/i.test(
    (spike.find(s => s.key === 'load-spike') || {}).detail || ''),
    'signals: load signal reports the jump without judging the training decision');
  check(!keys(sig([{id:'a', name:'A'}], [
    wk('a', day(-10), { total_distance_m: 2000 }),
    wk('a', day(-2),  { total_distance_m: 4000 })
  ])).includes('load-spike'), 'signals: tiny prior-week base does not trigger a spike');

  // 4. Self-reported effort on easy days.
  const eff = d => wk('a', d, { workout_type:'recovery', perceived_effort: 9 });
  check(keys(sig([{id:'a', name:'A'}], [eff(day(-1)), eff(day(-3))])).includes('effort'),
    'signals: repeated 8+ effort on recovery days raises the effort signal');
  check(!keys(sig([{id:'a', name:'A'}], [
    wk('a', day(-1), { workout_type:'vo2', perceived_effort: 9 }),
    wk('a', day(-3), { workout_type:'speed', perceived_effort: 10 })
  ])).includes('effort'), 'signals: hard effort on hard days is not flagged');

  // 5/6. Race direction — requires two dated results at one distance.
  const hist = rows => [{ id:'a', name:'Runner', raceHistory: rows }];
  const slower = sig(hist([
    { event:'800m', distM:800, sec:120.0, date:'2026-04-01' },
    { event:'800m', distM:800, sec:124.0, date:'2026-05-01' }
  ]), []);
  check(keys(slower).includes('slower'), 'signals: a result 3.3% off a prior best is flagged');
  check((slower.find(s => s.key === 'slower') || {}).sev === 'alert', 'signals: a slower result is an alert');
  const faster = sig(hist([
    { event:'800m', distM:800, sec:124.0, date:'2026-04-01' },
    { event:'800m', distM:800, sec:120.0, date:'2026-05-01' }
  ]), []);
  check(keys(faster).includes('faster'), 'signals: a new best is surfaced as good news');
  check(!keys(sig(hist([
    { event:'800m', distM:800, sec:120.0, date:'2026-04-01' },
    { event:'800m', distM:800, sec:120.9, date:'2026-05-01' }
  ]), [])).length, 'signals: sub-1.5% race variation is noise, not a signal');
  check(!keys(sig(hist([{ event:'800m', distM:800, sec:120, date:'2026-04-01' }]), [])).length,
    'signals: one dated result at a distance cannot show direction');
  check(!keys(sig(hist([
    { event:'800m', distM:800, sec:120.0, date:'2026-04-01' },
    { event:'1600m', distM:1600, sec:280.0, date:'2026-05-01' }
  ]), [])).length, 'signals: two different events are never compared to each other');
  // The whole reason raceHistory exists: PR fields alone cannot regress.
  check(!keys(sig([{ id:'a', name:'A', raceDistance:'800m', raceTime:'2:00',
    additionalPRs:{ '1600m':'4:40' } }], [])).length,
    'signals: PR fields without dated history produce no direction signal');

  // Ordering + determinism
  const mixed = sig([
    { id:'a', name:'Quiet Kid' },
    { id:'b', name:'Fast Kid', raceHistory:[
      { event:'800m', distM:800, sec:124.0, date:'2026-04-01' },
      { event:'800m', distM:800, sec:118.0, date:'2026-05-01' }] }
  ], [wk('a', day(-20))]);
  check(mixed.length >= 2 && mixed[0].sev === 'alert' && mixed[mixed.length-1].sev === 'good',
    'signals: alerts sort above good news');
  check(stableJSON(sig([
    { id:'a', name:'Zed' }, { id:'b', name:'Abe' }
  ], [wk('a', day(-20)), wk('b', day(-20))])) ===
       stableJSON(sig([
    { id:'b', name:'Abe' }, { id:'a', name:'Zed' }
  ], [wk('b', day(-20)), wk('a', day(-20))])),
    'signals: output is independent of roster input order');

  // Athlete matching must work off the cloud id the workout rows carry.
  check(keys(sig([{ id:'local-ref', supabaseId:'uuid-1', name:'A' }],
    [wk('uuid-1', day(-20))])).includes('quiet'),
    'signals: workouts join on supabaseId when the local id differs');

  // Wiring: the brief exposes signals, and the screen leads with them.
  const data = E.computeCoachBriefData([{ id:'a', name:'A' }], T, [wk('a', day(-20))]);
  check(Array.isArray(data.signals) && data.signals.length === 1,
    'computeCoachBriefData: signals ride along with the hygiene priorities');
  check(Array.isArray(data.priorities) && data.priorities.length > 0,
    'computeCoachBriefData: roster-input priorities are retained, not deleted');
}

// The signal panel must render ABOVE the roster-input queue, and the old
// "Review queue / Evidence gaps first" framing must not lead the screen.
const signalsAt = html.indexOf('${signalsPanel}');
const prioritiesAt = html.indexOf('${priorities}');
check(signalsAt > 0 && prioritiesAt > 0 && signalsAt < prioritiesAt,
  'Coach Brief renders athlete signals above the roster-input queue');
check(/brief-panel-title">Athlete signals/.test(html),
  'Coach Brief has an Athlete signals panel');
check(/brief-panel-title">Roster inputs<\/p><span class="brief-panel-tag">Housekeeping/.test(html),
  'The data-hygiene list is labelled as housekeeping, not the lead');
check(/does not infer fatigue, readiness, or injury risk/.test(html),
  'The signals panel carries its evidence disclaimer in the UI');
check(html.indexOf('perceived_effort') > 0 && /select\([^)]*perceived_effort/.test(html),
  'The workout query fetches the effort column the signal layer reads');
check(/\.gte\('workout_date', fetchStart\)[\s\S]{0,120}\.lte\('workout_date', fetchEnd\)/.test(html),
  'The workout query runs to today so a 10-day gap is answerable');

if(failures.length){
  console.error(`coach brief probes FAILED — ${failures.length} contract${failures.length === 1 ? '' : 's'} missing`);
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  console.error(`passing assertions: ${passed}`);
  process.exit(1);
}

console.log(`coach brief probes ok — ${passed} assertions`);
