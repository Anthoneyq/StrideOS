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
  'prFreshness', 'getEventDomain', 'getObservedRatio',
  'sameDistanceM', 'forecastTargets', 'labelForDistance',
  'freshnessPenaltyFor', 'confidenceLabel', 'primaryPRForAthlete',
  'observedPRForTarget', 'collectAllPRs', 'personalFatigueExponent',
  '_selectBestAnchor', 'raceForecastForTarget',
];
const distSrc = (html.match(/const DIST = \{[\s\S]*?\};/) || [''])[0];
const domainsSrc = (html.match(/const EVENT_DOMAINS = \{[\s\S]*?\};/) || [''])[0];
const ratiosSrc = (html.match(/const OBSERVED_RATIOS = \{[\s\S]*?\};/) || [''])[0];
if(!distSrc) throw new Error('DIST missing from index.html');
if(!domainsSrc) throw new Error('EVENT_DOMAINS missing from index.html');
if(!ratiosSrc) throw new Error('OBSERVED_RATIOS missing from index.html');

const ctx = { Math, console };
vm.createContext(ctx);
// `const` inside the vm script doesn't attach to the context object — export explicitly.
vm.runInContext(distSrc + '\n' + domainsSrc + '\n' + NEEDED.map(grab).join('\n') + '\n' + ratiosSrc + '\nthis.OBSERVED_RATIOS = OBSERVED_RATIOS;', ctx);

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
inRange('pctToMult(65) uses speed percentage', ctx.pctToMult(65), 1.53, 1.55);
inRange('pctToMult(105) faster-than-race speed', ctx.pctToMult(105), 0.94, 0.96);

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
