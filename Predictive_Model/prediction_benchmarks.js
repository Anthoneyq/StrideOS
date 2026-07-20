#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// STRIDE OS — PREDICTION ENGINE REGRESSION BENCHMARKS
// Run:  node Predictive_Model/prediction_benchmarks.js
// Extracts the live engine functions from ../index.html and asserts they
// stay calibrated against published references (Daniels VDOT tables,
// Vickers & Vertosick 2016, NFHS/McMillan equivalence charts).
// Exits 1 on any failure — run before every deploy that touches the engine.
// ══════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a top-level function by brace matching.
function grab(name){
  const i = html.indexOf('function ' + name + '(');
  if(i < 0) throw new Error('Engine function missing from index.html: ' + name);
  let depth = 0;
  for(let k = html.indexOf('{', i); k < html.length; k++){
    if(html[k] === '{') depth++;
    if(html[k] === '}'){ depth--; if(!depth) return html.slice(i, k + 1); }
  }
  throw new Error('Unbalanced braces in ' + name);
}

const NEEDED = [
  'parseTime', 'pctToMult',
  'danielsPctVO2', 'danielsVO2atVelocity', 'calcVDOT',
  '_formulaRiegel', '_formulaCameron', '_formulaVDOT',
  '_formulaVickersVertosick', '_formulaPurdy',
  '_ensembleWeights', 'strideEnsemble',
  '_daysSinceRace', 'prFreshness', 'getEventDomain', 'getObservedRatio',
  'sameDistanceM', 'forecastTargets', 'labelForDistance',
  'freshnessPenaltyFor', 'confidenceLabel', 'primaryPRForAthlete',
  'observedPRForTarget', 'collectAllPRs', 'personalFatigueExponent',
  '_selectBestAnchor', 'nearestAnchorForTarget', '_med', 'raceForecastForTarget',
  // Math-audit minors + BUG-033/034/037 probes:
  '_mmss', 'fmtT', 'fmt400', 'parseDurationToSec', 'altitudeCorrection',
  '_normDate', 'vToSpkm', 'vAtPct', 'taMod', 'calcZones', 'vdotPctForZone',
];
const distSrc = (html.match(/const DIST = \{[\s\S]*?\};/) || [''])[0];
const domainsSrc = (html.match(/const EVENT_DOMAINS = \{[\s\S]*?\};/) || [''])[0];
const ratiosSrc = (html.match(/const OBSERVED_RATIOS = \{[\s\S]*?\};/) || [''])[0];
if(!distSrc) throw new Error('DIST missing from index.html');
if(!domainsSrc) throw new Error('EVENT_DOMAINS missing from index.html');
if(!ratiosSrc) throw new Error('OBSERVED_RATIOS missing from index.html');

const flagSrc = (html.match(/const VDOT_ZONE_RECONCILIATION_ENABLED = (?:true|false);/) || [''])[0];
if(!flagSrc) throw new Error('VDOT_ZONE_RECONCILIATION_ENABLED missing from index.html');
const nudgeFlagSrc = (html.match(/const OBSERVED_RATIO_NUDGE_ENABLED = (?:true|false);/) || [''])[0];
if(!nudgeFlagSrc) throw new Error('OBSERVED_RATIO_NUDGE_ENABLED missing from index.html');

// `const` inside the vm script doesn't attach to the context object — export explicitly.
const engineSrc = distSrc + '\n' + domainsSrc + '\n' + flagSrc + '\n' + nudgeFlagSrc + '\n' + NEEDED.map(grab).join('\n') + '\n' + ratiosSrc + '\nthis.OBSERVED_RATIOS = OBSERVED_RATIOS;' + '\nthis.VDOT_ZONE_RECONCILIATION_ENABLED = VDOT_ZONE_RECONCILIATION_ENABLED;' + '\nthis.OBSERVED_RATIO_NUDGE_ENABLED = OBSERVED_RATIO_NUDGE_ENABLED;';
const ctx = { Math, Date, console };
vm.createContext(ctx);
vm.runInContext(engineSrc, ctx);

// ── Assertion harness ──
let pass = 0, fail = 0;
const fmt = s => {
  s = Math.round(s);
  const h = Math.floor(s/3600), m = Math.floor(s%3600/60), ss = s%60;
  return (h ? h + ':' + String(m).padStart(2,'0') : m) + ':' + String(ss).padStart(2,'0');
};
function inRange(label, actual, lo, hi){
  const ok = actual >= lo && actual <= hi;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${typeof actual === 'number' && actual > 90 ? fmt(actual) : actual.toFixed ? actual.toFixed(2) : actual}  [expect ${actual > 90 ? fmt(lo)+'–'+fmt(hi) : lo+'–'+hi}]`);
}
function isEqual(label, actual, expected){
  const ok = Object.is(actual, expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${actual}  [expect ${expected}]`);
}

// ── 0. Input parsing and pace-percentage guardrails ──
inRange('parseTime("4:59.9") seconds', ctx.parseTime('4:59.9'), 299.8, 300.0);
isEqual('parseTime rejects 4:75', ctx.parseTime('4:75'), null);
isEqual('parseTime rejects 1:02:75', ctx.parseTime('1:02:75'), null);
isEqual('prFreshness rejects future-dated PRs', ctx.prFreshness('2999-01-01'), 'future');
// Canova "% of race pace" multiplier (2 − pct/100): Easy 65% = 1.35 → ~7:16/mi
// for a 16:43 5K runner, the coach-validated value (Muntefering/Framke). The old
// reciprocal speed-% model (1.538) made aerobic zones ~1 min/mi too slow.
inRange('pctToMult(65) Canova race-pace mult', ctx.pctToMult(65), 1.34, 1.36);
inRange('pctToMult(55) recovery slower than easy', ctx.pctToMult(55), 1.44, 1.46);
inRange('pctToMult(93) threshold ~unchanged vs reciprocal', ctx.pctToMult(93), 1.06, 1.08);
inRange('pctToMult(105) faster-than-race', ctx.pctToMult(105), 0.94, 0.96);

// ── 1. VDOT calibration (Daniels' Running Formula tables) ──
inRange('VDOT(5K 19:57) ≈ 50',  ctx.calcVDOT(5000, 1197),  49.5, 50.5);
inRange('VDOT(10K 41:21) ≈ 50', ctx.calcVDOT(10000, 2481), 49.5, 50.5);
// Note: Daniels' tables are generated from this same regression, so the
// formula's own output IS the reference at this fitness level (~67).
inRange('VDOT(5K 15:29) ≈ 67',  ctx.calcVDOT(5000, 929),   66.0, 68.0);

// ── 2. Internal consistency: %VO2max must use minutes ──
// At 20 min the sustained fraction should be ~0.95, NOT ~0.80 (the seconds bug).
inRange('danielsPctVO2(1200s) ≈ 0.95', ctx.danielsPctVO2(1200), 0.93, 0.97);

// ── 3. Distance-family ensemble vs Daniels equivalence (VDOT 50 row) ──
const e = (d1,t1,d2,o) => ctx.strideEnsemble(d1,t1,d2,1.0,o).predSec;
inRange('5K 19:57 → 10K',  e(5000,1197,10000),  2460, 2540);   // 41:00–42:20
inRange('5K 19:57 → Half', e(5000,1197,21097),  5430, 5680);   // 1:30:30–1:34:40
// Marathon: between Daniels equivalence (3:10:49) and V&V low-mileage reality.
inRange('5K 19:57 → Marathon (no mileage)', e(5000,1197,42195), 11500, 12600);
// Volume sensitivity must point the right way (more miles → faster prediction).
const mLow = e(5000,1197,42195,{weeklyMiles:15});
const mHigh = e(5000,1197,42195,{weeklyMiles:65});
inRange('Marathon volume effect (low−high mileage, sec)', mLow - mHigh, 120, 1100);

// ── 4. Short-event calibration (NFHS/McMillan-style equivalences) ──
inRange('100m 11.0 → 200m',  e(100,11.0,200),   22.2, 22.9);
inRange('200m 24.0 → 400m',  e(200,24.0,400),   52.5, 55.0);
inRange('400m 52.0 → 800m',  e(400,52.0,800),   113, 120);     // 1:53–2:00
inRange('800m 2:00 → 1600m', e(800,120,1600),   258, 272);     // 4:18–4:32
inRange('1600m 4:28 → 3200m',e(1600,268,3200),  560, 585);     // 9:20–9:45

// ── 5. Sanity invariants ──
// Predicting up then back down must roughly return the anchor (path consistency).
const up = e(5000,1197,10000), back = e(10000,up,5000);
inRange('Round-trip 5K→10K→5K drift (sec)', Math.abs(back - 1197), 0, 30);
// OBSERVED_RATIOS must imply physically possible fatigue exponents (>1.0).
let ratioOK = 1;
for(const key of Object.keys(ctx.OBSERVED_RATIOS)){
  const [a,b] = key.split('_').map(Number);
  const k = Math.log(ctx.OBSERVED_RATIOS[key]) / Math.log(b/a);
  if(k <= 1.0 || k > 1.2) ratioOK = 0;
}
inRange('OBSERVED_RATIOS imply 1.0 < k ≤ 1.2', ratioOK, 1, 1);
// Longer distance must always take longer.
inRange('Monotonic: marathon > half', e(5000,1197,42195) - e(5000,1197,21097), 1, 1e9);

// ── 6. Source-excluded multi-PR prediction hygiene ──
const athlete = {
  raceDistance: '1600m',
  raceDistanceM: 1600,
  raceTime: '4:30',
  raceDate: '2026-05-01',
  additionalPRs: {
    '3200m': '9:50',
    '5K': '15:50',
    '8K': '26:20',
    'Half Marathon': '1:12:00'
  }
};
const prs = ctx.collectAllPRs(athlete);
inRange('collectAllPRs includes expanded distance map', prs.length, 5, 5);
const anchorFor3200 = ctx._selectBestAnchor(3200, athlete, { excludeTarget: true });
isEqual('_selectBestAnchor excludes target PR', anchorFor3200.distM === 3200, false);
isEqual('personalFatigueExponent can exclude target event', ctx.personalFatigueExponent(athlete, { excludeDistM: 3200 }).nPRs < ctx.personalFatigueExponent(athlete).nPRs, true);
const observed3200 = ctx.raceForecastForTarget(athlete, { distM: 3200, label: '3200m' });
isEqual('raceForecastForTarget labels logged target as observed', observed3200.isObserved, true);
const forecast10K = ctx.raceForecastForTarget(athlete, { distM: 10000, label: '10K' });
isEqual('raceForecastForTarget returns source-excluded forecast for unknown target', !!forecast10K && !forecast10K.isObserved && forecast10K.likely > 0, true);
isEqual('raceForecastForTarget labels displayed range as uncalibrated', forecast10K.rangeMethod, 'heuristic_planning_range_uncalibrated');
isEqual('raceForecastForTarget carries model-disagreement range separately', forecast10K.modelLow < forecast10K.likely && forecast10K.modelHigh > forecast10K.likely, true);

// ── 7. Math-audit 2026-07-19 regression probes (BUG-028..032) ──
// BUG-028: a soft (contradicted) short PR must neither anchor mile-family
// forecasts nor let them break the pace ceiling. The audit athlete: 5K 15:30
// primary + old 800m 2:50 (2:50/800 = 212s pace/km vs 5K 186s pace/km — soft).
// Broken engine forecast 1600m 6:09.8; from the 5K it should be ~4:35–4:45.
const softPrAthlete = {
  raceDistance: '5K', raceDistanceM: 5000, raceTime: '15:30', raceDate: '2026-05-01',
  additionalPRs: { '800m': '2:50' }
};
const soft1600 = ctx.raceForecastForTarget(softPrAthlete, { distM: 1600, label: '1600m' },
  { fixedAnchor: ctx.nearestAnchorForTarget(softPrAthlete, 1600) });
inRange('BUG-028: soft 800 must not anchor 1600 (forecast sec)', soft1600.likely, 265, 288);
isEqual('BUG-028: 1600 anchored from the trusted 5K', soft1600.anchor.distM === 5000, true);
// Ceiling invariant: no forecast row may be a slower pace than the observed 5K.
const soft3000 = ctx.raceForecastForTarget(softPrAthlete, { distM: 3000, label: '3000m' },
  { fixedAnchor: ctx.nearestAnchorForTarget(softPrAthlete, 3000) });
const pace = (sec, d) => sec / d;
isEqual('BUG-028: no pace inversion 1600 vs 3000', pace(soft1600.likely,1600) <= pace(soft3000.likely,3000) + 1e-9, true);
isEqual('BUG-028: 1600 not slower pace than own 5K', pace(soft1600.likely,1600) <= pace(930,5000) + 1e-9, true);

// BUG-029: Mile (1609) must sit in the same weight branch as 1600m — adjacent
// forecast rows from a 400m anchor may not invert (longer race faster).
const t1600 = e(400,52.0,1600), tMile = e(400,52.0,1609.34);
inRange('BUG-029: Mile slower than 1600m from 400m anchor (sec gap)', tMile - t1600, 0.1, 10);

// BUG-030: downward hybrid→sprint must follow the segmented curve, not the
// flat default (800m 2:00 → 400m was 56.1s vs the curve's own ~53.0, NFHS ~53.5).
inRange('BUG-030: 800m 2:00 → 400m (downward)', e(800,120,400), 52.5, 55.0);
const down = e(800,120,400), rt = e(400,down,800);
inRange('BUG-030: round-trip 400↔800 drift (sec)', Math.abs(rt - 120), 0, 3.0);

// BUG-031/032: _med must be a true median — even counts average the middles.
isEqual('_med even count averages middles', ctx._med([1080,1200]), 1140);
isEqual('_med odd count picks middle', ctx._med([3,1,2]), 2);

// ── 8. Math-audit display/date/minor probes (BUG-033/034/037 + E-minors) ──
// BUG-033: only whole kilometres get the km label (1200 collided with 1km).
// repLabel is a local inside buildDanielsTable — extract the arrow fn source.
const repLabelSrc = (html.match(/const repLabel = (d => \{[\s\S]*?\n  \});/) || [])[1];
if(!repLabelSrc) throw new Error('repLabel missing from buildDanielsTable');
const repLabel = vm.runInContext('(' + repLabelSrc + ')', ctx);
isEqual('BUG-033: repLabel(1200) is 1200m', repLabel(1200), '1200m');
isEqual('BUG-033: repLabel(1000) is 1km', repLabel(1000), '1km');
isEqual('BUG-033: repLabel(1609) is 1mi', repLabel(1609), '1mi');

// BUG-034: freshness must compare CALENDAR days — a race dated today is
// "fresh" (0 days old) at ANY local time of day, never "1 days old"/"future".
const _now = new Date();
const todayLocal = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
isEqual('BUG-034: today-dated race is 0 days old', ctx._daysSinceRace(todayLocal), 0);
isEqual('BUG-034: today-dated race is fresh', ctx.prFreshness(todayLocal), 'fresh');

// BUG-037: the VDOT zone reconciliation stays explicitly gated OFF…
isEqual('BUG-037: vdotPctForZone gated off', ctx.vdotPctForZone({label:'Easy',pct:65}, {raceDistanceM:5000, raceTime:'19:57'}), null);
// …and if the gate is ever opened, the math must be the self-consistent
// Canova inverse: pctToMult(pct) must reproduce the target/race pace ratio
// (the old reciprocal model broke exactly this round-trip).
const enabledCtx = { Math, Date, console };
vm.createContext(enabledCtx);
vm.runInContext(distSrc + '\nconst VDOT_ZONE_RECONCILIATION_ENABLED = true;\n' +
  ['parseTime','pctToMult','danielsPctVO2','danielsVO2atVelocity','calcVDOT','vToSpkm','vAtPct','taMod','calcZones','vdotPctForZone'].map(grab).join('\n'), enabledCtx);
const zAthlete = { raceDistanceM: 5000, raceTime: '19:57', trainingAge: 3 };
const easyPct = enabledCtx.vdotPctForZone({label:'Easy',pct:65}, zAthlete);
inRange('BUG-037: enabled Easy pct plausible', easyPct, 45, 90);
const zones = enabledCtx.calcZones(5000, 1197, 3);
const rtRatio = enabledCtx.pctToMult(easyPct) * (1197/5000) * 1000 / zones.E.mid;
inRange('BUG-037: Canova inverse round-trips (ratio ≈ 1)', rtRatio, 0.999, 1.001);
// vToSpkm units: VDOT-50 velocity ~268 m/min → ~224 s/km (was ~3.7 "s"/km).
inRange('BUG-037: vToSpkm returns sec/km', ctx.vToSpkm(268), 220, 228);

// E-minors: carry-safe formatting, strict duration parsing, altitude guard,
// local date printing.
isEqual('fmtT >1h rounds with carry (3659.94)', ctx.fmtT(3659.94), '1:01:00');
isEqual('fmtT hour boundary (3599.96)', ctx.fmtT(3599.96), '1:00:00');
isEqual('fmt400 carries 59.96 to 60', ctx.fmt400(149.9), '60/400');
isEqual('parseDurationToSec rejects 1:75', ctx.parseDurationToSec('1:75'), null);
isEqual('parseDurationToSec rejects 1a:30', ctx.parseDurationToSec('1a:30'), null);
isEqual('parseDurationToSec accepts 32:14', ctx.parseDurationToSec('32:14'), 1934);
isEqual('altitudeCorrection 1600ft (<500m) is 0', ctx.altitudeCorrection(1600), 0);
isEqual('altitudeCorrection 1700ft (>500m) applies', ctx.altitudeCorrection(1700), 0.01);
isEqual('_normDate prints local date (no UTC shift)', ctx._normDate('May 3, 2026'), '2026-05-03');
isEqual('_normDate US format', ctx._normDate('5/3/26'), '2026-05-03');

// ── 9. OBSERVED_RATIOS nudge gate (BUG-036 follow-up — flagged; evidence in
// NUDGE-EVIDENCE-2026-07-19.md) ──
// The ≥3000m equivalent-performance nudge sits behind OBSERVED_RATIO_NUDGE_ENABLED
// (true = shipped 30% blend, the current default; false = drop it — the
// evidence-backed option, measured 1.082→1.011 median on the 58 predictions it
// changes). BOTH states are pinned against fixed fixtures and the live engine
// must match whichever state index.html declares, so the owner's decision
// stays a one-line flag flip with this suite green either way.
const nudgeCtxFor = flag => {
  const c = { Math, Date, console };
  vm.createContext(c);
  vm.runInContext(engineSrc.replace(nudgeFlagSrc, `const OBSERVED_RATIO_NUDGE_ENABLED = ${flag};`), c);
  return c;
};
const nudgeOn = nudgeCtxFor(true), nudgeOff = nudgeCtxFor(false);
const nudgeAthlete = { raceDistance: '5K', raceDistanceM: 5000, raceTime: '19:57', raceDate: null, additionalPRs: {} };
const f10On  = nudgeOn.raceForecastForTarget(nudgeAthlete, { distM: 10000, label: '10K' });
const f10Off = nudgeOff.raceForecastForTarget(nudgeAthlete, { distM: 10000, label: '10K' });
const ens10 = e(5000, 1197, 10000);
inRange('Nudge OFF = bare ensemble (5K→10K, sec diff)', Math.abs(f10Off.likely - ens10), 0, 1e-9);
inRange('Nudge ON = 30% Daniels-ratio blend (5K→10K, sec diff)',
  Math.abs(f10On.likely - (0.3 * 1197 * ctx.OBSERVED_RATIOS['5000_10000'] + 0.7 * ens10)), 0, 1e-9);
isEqual('Nudge flag actually changes the 10K forecast', Math.abs(f10On.likely - f10Off.likely) > 0.5, true);
isEqual('Nudge ON explains itself in reasons', f10On.reasons.some(r => r.includes('equivalent-performance')), true);
isEqual('Nudge OFF drops the reason line', f10Off.reasons.some(r => r.includes('equivalent-performance')), false);
// Marathon wiring check only — the HM/M ratios are UNTESTED by backtest data:
const fMarOn  = nudgeOn.raceForecastForTarget(nudgeAthlete, { distM: 42195, label: 'Marathon' });
const fMarOff = nudgeOff.raceForecastForTarget(nudgeAthlete, { distM: 42195, label: 'Marathon' });
inRange('Nudge ON marathon = 30% blend (sec diff)',
  Math.abs(fMarOn.likely - (0.3 * 1197 * ctx.OBSERVED_RATIOS['5000_42195'] + 0.7 * fMarOff.likely)), 0, 1e-9);
// Nudge scope is ≥3000m standardized pairs — shorter pairs identical either way:
const subFix = { raceDistance: '1600m', raceDistanceM: 1600, raceTime: '4:30', raceDate: null, additionalPRs: {} };
const sub = c => c.raceForecastForTarget(subFix, { distM: 3200, label: '3200m' });
inRange('Nudge never touches sub-3000m pairs (1600→3200 diff)', Math.abs(sub(nudgeOn).likely - sub(nudgeOff).likely), 0, 1e-9);
// Ship parity: the live engine matches the state index.html declares — the
// flag flip is the ONLY thing that may move it between the two pinned behaviors.
const f10Live = ctx.raceForecastForTarget(nudgeAthlete, { distM: 10000, label: '10K' });
inRange('Live engine matches declared nudge-flag state (sec diff)',
  Math.abs(f10Live.likely - (ctx.OBSERVED_RATIO_NUDGE_ENABLED ? f10On.likely : f10Off.likely)), 0, 1e-9);

// Engine-version tracking: the 2026-07-19 math-audit pass (anchor selection, pace
// ceiling, Mile boundary, nudge flag) changes logged forecasts, and
// PREDICTION_ENGINE_VERSION keys snapshot dedup + calibration records — so the
// version MUST move with the math. Any future forecast-affecting change must bump
// the constant in index.html AND this pinned string, consciously, together.
const engineVer = (html.match(/const PREDICTION_ENGINE_VERSION = '([^']+)';/) || [])[1] || '';
inRange("Engine version bumped with the math-audit changes (0=exact match)",
  engineVer === 'ensemble-2026-07-19-mathaudit-paceceil-nudgeflag' ? 0 : 1, 0, 0);
inRange('Engine version is not the pre-audit string (0=differs)',
  engineVer === 'ensemble-2026-07-01-kfloor-spanfade' ? 1 : 0, 0, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
