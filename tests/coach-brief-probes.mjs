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
    extractFn('computeCoachBriefData'),
    'return { coachBriefDateState, computeCoachBriefData };'
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

if(failures.length){
  console.error(`coach brief probes FAILED — ${failures.length} contract${failures.length === 1 ? '' : 's'} missing`);
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  console.error(`passing assertions: ${passed}`);
  process.exit(1);
}

console.log(`coach brief probes ok — ${passed} assertions`);
