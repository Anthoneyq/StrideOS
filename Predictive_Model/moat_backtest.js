#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// STRIDE OS — MOAT BACKTEST (held-out, real athletes)
// Run:  node Predictive_Model/moat_backtest.js
//
// The "superior predictor" claim has only ever been checked against PUBLISHED
// equivalence tables + coach eyeball (which failed live). This harness does the
// real test: take REAL athletes who ran ≥2 different events in the SAME season,
// HIDE one race, predict it from the other(s) with the live StrideOS engine, and
// compare the error to a naive Riegel-1.06 baseline (the commodity formula every
// free calculator uses). If StrideOS doesn't beat Riegel on real data, the moat
// claim is unproven — and we want to know that BEFORE selling on it.
//
// Data: Data_Validation/hs_to_college_pipeline.csv + elite_career_arcs.csv
// (athlete-keyed, multi-event). XC events excluded (variable course distance).
// ══════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── 1. Extract the live engine from index.html (same mechanism as prediction_benchmarks.js) ──
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function grab(name){
  const i = html.indexOf('function ' + name + '(');
  if(i < 0) throw new Error('Engine function missing: ' + name);
  let depth = 0;
  for(let k = html.indexOf('{', i); k < html.length; k++){
    if(html[k] === '{') depth++;
    if(html[k] === '}'){ depth--; if(!depth) return html.slice(i, k + 1); }
  }
  throw new Error('Unbalanced braces in ' + name);
}
const NEEDED = [
  'parseTime', 'pctToMult', 'danielsPctVO2', 'danielsVO2atVelocity', 'calcVDOT',
  '_formulaRiegel', '_formulaCameron', '_formulaVDOT', '_formulaVickersVertosick',
  '_formulaPurdy', '_csDamp', '_csUndamp', '_fitCriticalVelocity',
  '_formulaCriticalVelocity', '_formulaTinmanCV','_formulaPersonalK', '_memberPredict', '_memberLooErrors',
  '_adaptiveEnsembleWeights', '_ensembleWeights', 'strideEnsemble', 'getEventDomain',
  'getObservedRatio', 'sameDistanceM',
  // Mode B (multi-PR leave-one-out) needs the actual shipped forecast path:
  '_daysSinceRace', 'prFreshness', 'forecastTargets', 'labelForDistance',
  'freshnessPenaltyFor', 'confidenceLabel', 'primaryPRForAthlete',
  'observedPRForTarget', 'collectAllPRs', 'personalFatigueExponent',
  '_selectBestAnchor', 'nearestAnchorForTarget', '_med', 'raceForecastForTarget',
];
const distSrc    = (html.match(/const DIST = \{[\s\S]*?\};/) || [''])[0];
const domainsSrc = (html.match(/const EVENT_DOMAINS = \{[\s\S]*?\};/) || [''])[0];
const ratiosSrc  = (html.match(/const OBSERVED_RATIOS = \{[\s\S]*?\};/) || [''])[0];
const nudgeFlagSrc = (html.match(/const OBSERVED_RATIO_NUDGE_ENABLED = (?:true|false);/) || [''])[0];
if(!nudgeFlagSrc) throw new Error('OBSERVED_RATIO_NUDGE_ENABLED missing from index.html');
const stackSrc = (html.match(/const ADAPTIVE_STACKING_ENABLED = (?:true|false);/)||[''])[0]
  + '\n' + (html.match(/const _STACK_SHRINK_TAU = [\d.]+;/)||[''])[0]
  + '\n' + (html.match(/const _STACK_MAPE_FLOOR = [\d.]+;/)||[''])[0]
  + '\n' + (html.match(/const _STACK_MEMBERS = \[[^\]]*\];/)||[''])[0];
if(stackSrc.trim().split('\n').length < 4) throw new Error('Stacking constants missing from index.html');
const ctx = { Math, console };
vm.createContext(ctx);
vm.runInContext(distSrc + '\n' + domainsSrc + '\n' + nudgeFlagSrc + '\n' + stackSrc + '\n' + NEEDED.map(grab).join('\n') + '\n' + ratiosSrc +
  '\nthis.OBSERVED_RATIOS = OBSERVED_RATIOS;' +
  '\nthis.OBSERVED_RATIO_NUDGE_ENABLED = OBSERVED_RATIO_NUDGE_ENABLED;', ctx);

// ── MODE A: single-anchor shipped path ──
// StrideOS predicted time at d2 (m) from time t1 (s) at d1 (m).
// Ship-path parity (BUG-036): the product's raceForecastForTarget additionally
// blends a 30% equivalent-performance nudge on ≥3000m pairs, so this mode
// applies it too — scoring a bare component while shipping the nudged value
// validated a different engine than coaches see. The nudge is behind the
// OBSERVED_RATIO_NUDGE_ENABLED gate (read from index.html, so this mode tracks
// whatever ships; evidence in NUDGE-EVIDENCE-2026-07-19.md). Personal-k and
// the pace floor/ceiling need multi-PR context a single anchor doesn't carry,
// so for a SINGLE-PR athlete the shipped path reduces to exactly this; the
// multi-PR path is scored separately in MODE B below through
// raceForecastForTarget.
const stridePred = (d1, t1, d2) => {
  let pred = ctx.strideEnsemble(d1, t1, d2, 1.0, {}).predSec;
  const ratio = ctx.getObservedRatio(d1, d2);
  if(ctx.OBSERVED_RATIO_NUDGE_ENABLED && ratio && d1 >= 3000 && d2 >= 3000) pred = (t1 * ratio) * 0.3 + pred * 0.7;
  return pred;
};
// Naive Riegel baseline (exponent 1.06) — the commodity formula:
const riegelPred = (d1, t1, d2) => t1 * Math.pow(d2 / d1, 1.06);

// ── 2. Parsing helpers ──
// Quote-aware CSV line splitter (handles embedded commas in quoted fields).
function splitCsv(line){
  const out = []; let cur = '', q = false;
  for(let i = 0; i < line.length; i++){
    const c = line[i];
    if(c === '"'){ q = !q; }
    else if(c === ',' && !q){ out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim().replace(/^"|"$/g, ''));
}
function parseTimeSec(s){
  if(!s) return null;
  s = String(s).trim();
  if(!/^[\d:.]+$/.test(s)) return null;
  const parts = s.split(':').map(Number);
  if(parts.some(isNaN)) return null;
  let sec;
  if(parts.length === 1) sec = parts[0];
  else if(parts.length === 2) sec = parts[0]*60 + parts[1];
  else if(parts.length === 3) sec = parts[0]*3600 + parts[1]*60 + parts[2];
  else return null;
  return sec > 0 ? sec : null;
}
// Event label → meters. XC and unknowns return null (excluded).
const EV = {
  '100m':100,'200m':200,'300m':300,'400m':400,'500m':500,'600m':600,'800m':800,
  '1000m':1000,'1500m':1500,'1600m':1600,'mile':1609.34,'1 mile':1609.34,
  '2000m':2000,'3000m':3000,'3200m':3200,'2 mile':3218.69,'two mile':3218.69,
  '5000m':5000,'5k':5000,'8000m':8000,'8k':8000,'10000m':10000,'10k':10000,
  'half marathon':21097.5,'marathon':42195,
};
function eventMeters(label){
  if(!label) return null;
  const k = label.toLowerCase().trim();
  if(k.includes('xc') || k.includes('cross')) return null;   // variable course distance
  return EV[k] || null;
}

// ── 3. Load athlete-keyed rows: {athlete, sex, year, distM, sec} ──
function loadCsv(file, cols){
  const txt = fs.readFileSync(path.join(__dirname, '..', 'Data_Validation', file), 'utf8');
  const lines = txt.split(/\r?\n/).filter(l => l.trim());
  const header = splitCsv(lines[0]);
  const idx = name => header.indexOf(name);
  const rows = [];
  for(let i = 1; i < lines.length; i++){
    const f = splitCsv(lines[i]);
    const distM = eventMeters(f[idx(cols.event)]);
    const sec   = parseTimeSec(f[idx(cols.time)]);
    const athlete = f[idx(cols.athlete)];
    if(!distM || !sec || !athlete) continue;
    rows.push({
      athlete, distM, sec,
      sex:  cols.sex  ? f[idx(cols.sex)]  : '',
      year: cols.year ? f[idx(cols.year)] : '',
      src:  file.replace('.csv',''),
    });
  }
  return rows;
}
let rows = [];
rows = rows.concat(loadCsv('hs_to_college_pipeline.csv', { athlete:'athlete_name', event:'event', time:'time', sex:'sex', year:'year' }));
rows = rows.concat(loadCsv('elite_career_arcs.csv',      { athlete:'athlete_name', event:'event', time:'time', sex:'sex', year:'year' }));

// ── 4. Build same-season held-out pairs (control for fitness drift) ──
// Group by (athlete + year); within a group keep the fastest mark per distance;
// form every ordered pair of DISTINCT distances → predict one from the other.
const groups = {};
for(const r of rows){
  const key = r.athlete + '|' + r.year;
  (groups[key] = groups[key] || {});
  const g = groups[key];
  if(!g[r.distM] || r.sec < g[r.distM].sec) g[r.distM] = r;   // keep PR per distance
}
const pairs = [];
for(const key in groups){
  const dists = Object.values(groups[key]);
  if(dists.length < 2) continue;
  for(let i = 0; i < dists.length; i++){
    for(let j = 0; j < dists.length; j++){
      if(i === j) continue;
      pairs.push({ from: dists[i], to: dists[j] });   // predict `to` from `from`
    }
  }
}

// ── 5. Score: StrideOS vs Riegel, abs % error on the held-out race ──
function absPctErr(pred, actual){ return Math.abs(pred - actual) / actual * 100; }
const res = { stride: [], riegel: [], strideWins: 0, ties: 0, n: 0, byDomain: {}, athletes: new Set() };
for(const p of pairs){
  const sPred = stridePred(p.from.distM, p.from.sec, p.to.distM);
  const rPred = riegelPred(p.from.distM, p.from.sec, p.to.distM);
  if(!isFinite(sPred) || sPred <= 0) continue;
  const sErr = absPctErr(sPred, p.to.sec);
  const rErr = absPctErr(rPred, p.to.sec);
  res.stride.push(sErr); res.riegel.push(rErr); res.n++;
  res.athletes.add(p.from.athlete);
  if(sErr < rErr - 1e-9) res.strideWins++;
  else if(Math.abs(sErr - rErr) <= 1e-9) res.ties++;
  // distance-order gap (how far apart the events are — where the moat should show)
  const ratio = Math.max(p.to.distM, p.from.distM) / Math.min(p.to.distM, p.from.distM);
  const band = ratio >= 4 ? 'far (≥4×)' : ratio >= 2 ? 'mid (2–4×)' : 'near (<2×)';
  (res.byDomain[band] = res.byDomain[band] || { s: [], r: [] });
  res.byDomain[band].s.push(sErr); res.byDomain[band].r.push(rErr);
}

// ── 6. Report ──
const median = a => { if(!a.length) return NaN; const b=[...a].sort((x,y)=>x-y); const m=b.length>>1; return b.length%2?b[m]:(b[m-1]+b[m])/2; };
const mean   = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : NaN;
const within = (a,t) => a.length ? a.filter(x=>x<=t).length/a.length*100 : NaN;
const f1 = x => isNaN(x) ? '  n/a' : x.toFixed(1);

// Honest-n accounting (BUG-035): every unordered pair is scored in BOTH
// directions (errors correlate r≈0.94), so these are 292 ordered PREDICTIONS
// over ≈146 unique event pairs — never "races" or "runners" in copy; the
// athlete count is what public copy must cite.
const nAthletes = res.athletes.size;
const nSeasons  = Object.keys(groups).filter(k => Object.keys(groups[k]).length >= 2).length;
console.log('\n══ STRIDE OS MOAT BACKTEST — MODE A: single-anchor shipped path ══');
console.log(`${res.n} ordered held-out predictions (≈${Math.round(res.n/2)} unique event pairs — both directions scored) from ${nAthletes} athletes / ${nSeasons} athlete-seasons\n`);
console.log('                         StrideOS    Riegel-1.06');
console.log(`  median |%err|          ${f1(median(res.stride)).padStart(6)}      ${f1(median(res.riegel)).padStart(6)}`);
console.log(`  mean   |%err|          ${f1(mean(res.stride)).padStart(6)}      ${f1(mean(res.riegel)).padStart(6)}`);
console.log(`  within 1%              ${f1(within(res.stride,1)).padStart(6)}%     ${f1(within(res.riegel,1)).padStart(6)}%`);
console.log(`  within 2%              ${f1(within(res.stride,2)).padStart(6)}%     ${f1(within(res.riegel,2)).padStart(6)}%`);
console.log(`  within 3%              ${f1(within(res.stride,3)).padStart(6)}%     ${f1(within(res.riegel,3)).padStart(6)}%`);
console.log(`\n  StrideOS beats Riegel on ${res.strideWins}/${res.n} pairs (${(res.strideWins/res.n*100).toFixed(0)}%), ties ${res.ties}`);
console.log('\n  By event-distance gap (where the energy-system engine should help most):');
console.log('                         StrideOS med   Riegel med   n');
for(const band of ['near (<2×)','mid (2–4×)','far (≥4×)']){
  const d = res.byDomain[band]; if(!d) continue;
  console.log(`  ${band.padEnd(20)}   ${f1(median(d.s)).padStart(6)}        ${f1(median(d.r)).padStart(6)}     ${d.s.length}`);
}

// ── 6b. MODE B: Proof-Ledger-STYLE leave-one-out through the shipped forecast ──
// For every athlete-season, hold out each mark and predict it with
// raceForecastForTarget from the athlete's other same-season marks —
// nearest-anchor selection, personal-k blend (when ≥2 PRs remain), nudge,
// pace floor/ceiling. The in-app Proof Ledger's ELIGIBILITY rules are applied
// (near-duplicate anchor/target pairs ratio <1.1 skipped; all three models —
// STRIDE/Riegel/VDOT — must produce a finite time), so cohort membership
// matches computeProofLedger; the two implementations are separate code, so
// this is ledger-STYLE, not verified line-for-line parity. Folds where only
// ONE mark remains cannot engage personalFatigueExponent — they are reported
// separately from genuinely multi-PR folds, and only the multi-PR cohort may
// back personalization claims. Marks at distances with no StrideOS event name
// (300/500/600/1000/2000m) can't enter an athlete profile; skipped with a count.
const EVNAME = { 100:'100m', 200:'200m', 400:'400m', 800:'800m', 1500:'1500m',
  1600:'1600m', 1609.34:'Mile', 3000:'3000m', 3200:'3200m', 3218.69:'2 Mile',
  5000:'5K', 8000:'8K', 10000:'10K', 21097.5:'Half Marathon', 42195:'Marathon' };
const fmtTimeStr = s => {
  if(s < 60) return s.toFixed(2);
  const h = Math.floor(s/3600), m = Math.floor((s - h*3600)/60), ss = (s - h*3600 - m*60).toFixed(1);
  const mm = h ? String(m).padStart(2,'0') : String(m);
  return (h ? h + ':' + mm : mm) + ':' + (Number(ss) < 10 ? '0' : '') + ss;
};
const mkCohort = () => ({ stride: [], riegel: [], wins: 0, ties: 0, n: 0, athletes: new Set() });
const resB = mkCohort();        // every ledger-eligible fold
const resBMulti = mkCohort();   // folds where personal-k ACTUALLY activates (see below)
let skippedUnmappable = 0;
for(const key in groups){
  const marks = Object.values(groups[key]);
  const mappable = marks.filter(m => EVNAME[m.distM]);
  skippedUnmappable += marks.length - mappable.length;
  if(mappable.length < 2) continue;
  for(const target of mappable){
    const others = mappable.filter(m => m !== target);
    const primary = others[0];
    const additionalPRs = {};
    for(const o of others.slice(1)) additionalPRs[EVNAME[o.distM]] = fmtTimeStr(o.sec);
    const athlete = {
      name: target.athlete,
      raceDistance: EVNAME[primary.distM],
      raceDistanceM: primary.distM,
      raceTime: fmtTimeStr(primary.sec),
      raceDate: null,
      additionalPRs,
    };
    const anchor = ctx.nearestAnchorForTarget(athlete, target.distM);
    if(!anchor) continue;
    // Proof-Ledger eligibility rule 1: near-duplicate distances (1600↔Mile,
    // 3200↔2 Mile) are ~free self-tests — the ledger skips ratio <1.1.
    if(Math.max(anchor.distM, target.distM) / Math.min(anchor.distM, target.distM) < 1.1) continue;
    const f = ctx.raceForecastForTarget(athlete, { distM: target.distM, label: EVNAME[target.distM] },
      { fixedAnchor: anchor });
    if(!f || f.isObserved || !isFinite(f.likely) || f.likely <= 0) continue;
    const rieg = riegelPred(anchor.distM, anchor.sec, target.distM);
    // Proof-Ledger eligibility rule 2: all three models must produce a time
    // (VDOT returns nothing for sprint pairs — would NaN the ledger averages).
    const vdotP = ctx._formulaVDOT(anchor.distM, anchor.sec, target.distM);
    if(![f.likely, rieg, vdotP].every(v => v != null && isFinite(v))) continue;
    const sErr = absPctErr(f.likely, target.sec);
    const rErr = absPctErr(rieg, target.sec);
    const record = c => {
      c.stride.push(sErr); c.riegel.push(rErr); c.n++;
      c.athletes.add(target.athlete);
      if(sErr < rErr - 1e-9) c.wins++;
      else if(Math.abs(sErr - rErr) <= 1e-9) c.ties++;
    };
    record(resB);
    // Personalization cohort = folds where the personal fatigue curve ACTUALLY
    // engages in the shipped path: personalFatigueExponent returns non-null
    // (needs ≥2 remaining PRs ≥400m, pairwise distance ratio ≥1.3, k within
    // (1.005, 1.20)) AND the ≥400m target/anchor gates pass — NOT merely
    // "two PRs remain," which overcounted.
    const pk = ctx.personalFatigueExponent(athlete, { excludeDistM: target.distM });
    if(pk && target.distM >= 400 && anchor.distM >= 400) record(resBMulti);
  }
}
const cohortReport = (title, c) => {
  console.log(title);
  console.log('                         StrideOS    Riegel (same anchor)');
  console.log(`  median |%err|          ${f1(median(c.stride)).padStart(6)}      ${f1(median(c.riegel)).padStart(6)}`);
  console.log(`  mean   |%err|          ${f1(mean(c.stride)).padStart(6)}      ${f1(mean(c.riegel)).padStart(6)}`);
  console.log(`  within 2%              ${f1(within(c.stride,2)).padStart(6)}%     ${f1(within(c.riegel,2)).padStart(6)}%`);
  console.log(`  beats Riegel on ${c.wins}/${c.n} (${(c.wins/c.n*100).toFixed(0)}%), ties ${c.ties}\n`);
};
console.log('\n══ MODE B: Proof-Ledger-style leave-one-out through raceForecastForTarget ══');
console.log(`${resB.n} ledger-eligible held-out predictions from ${resB.athletes.size} athletes (${skippedUnmappable} marks skipped: no StrideOS event; near-dup + 3-model ledger rules applied)\n`);
cohortReport('ALL eligible folds (personal-k inert in most):', resB);
cohortReport(`PERSONAL-K-ACTIVE folds only — personalFatigueExponent non-null + ≥400m gates (${resBMulti.n} predictions, ${resBMulti.athletes.size} athletes; the ONLY cohort that may back personalization claims):`, resBMulti);
// Cohort-count regression locks (dataset is fixed CSVs; drift = a logic change):
const assertEq = (label, a, e) => { if(a !== e){ console.error(`ASSERT FAIL ${label}: ${a} !== ${e}`); process.exitCode = 1; } };
assertEq('Mode A ordered predictions', res.n, 292);
assertEq('Mode B eligible folds', resB.n, 165);
assertEq('Mode B personal-k-active folds', resBMulti.n, 56);
assertEq('Mode B personal-k-active athletes', resBMulti.athletes.size, 9);

// ── 6c. PRIOR DERIVATION + ABLATION (reproducible; added 2026-07-30) ──────────
// MODEL-EVIDENCE-2026-07-30.md claims the distance-family prior was derived by
// inverse median-error^4 with the RULE chosen under leave-one-ATHLETE-out CV.
// A claim that can't be re-run from the oracle is a story, so it is re-run here
// every time this file runs. Two things are reported:
//   (1) the derivation — each member's error on the ledger folds, the weights
//       the rule produces, and how competing rules score under leave-one-athlete-out;
//   (2) an ablation — adaptive stacking ON vs the population prior only, so the
//       stacking layer has to keep earning its place instead of being assumed.
// Each fold's members are scored from the SAME anchor the ledger used, and the
// 2-param CV fit only ever sees the athlete's other PRs.
const memberKeys = ['riegel','cameron','vdot','vickers','purdy','tinman'];
const derivFolds = [];
for(const key in groups){
  const marks = Object.values(groups[key]).filter(m => EVNAME[m.distM]);
  if(marks.length < 2) continue;
  for(const target of marks){
    const others = marks.filter(m => m !== target);
    const primary = others[0], additionalPRs = {};
    for(const o of others.slice(1)) additionalPRs[EVNAME[o.distM]] = fmtTimeStr(o.sec);
    const athlete = { name: target.athlete, raceDistance: EVNAME[primary.distM],
      raceDistanceM: primary.distM, raceTime: fmtTimeStr(primary.sec), raceDate: null, additionalPRs };
    const a = ctx.nearestAnchorForTarget(athlete, target.distM);
    if(!a) continue;
    if(Math.max(a.distM, target.distM) / Math.min(a.distM, target.distM) < 1.1) continue;
    const prs = ctx.collectAllPRs(athlete).filter(x => !ctx.sameDistanceM(x.distM, target.distM));
    const P = {};
    for(const k of memberKeys) P[k] = ctx._memberPredict(k, a.distM, a.sec, target.distM, prs, undefined);
    if(!isFinite(P.riegel)) continue;
    derivFolds.push({ P, actual: target.sec, athlete: target.athlete });
  }
}
const dAthletes = [...new Set(derivFolds.map(f => f.athlete))];
const errOf = (sub, k) => sub.filter(f => f.P[k] != null && isFinite(f.P[k]))
  .map(f => Math.abs(f.P[k] - f.actual) / f.actual * 100);
// The rule under test: w_i ∝ 1 / stat(err_i)^pow, members with <10 scored folds abstain.
function fitRule(sub, stat, pow){
  const w = {};
  for(const k of memberKeys){
    const e = errOf(sub, k);
    w[k] = e.length >= 10 ? 1 / Math.pow(Math.max(stat === 'med' ? median(e) : mean(e), 0.5), pow) : 0;
  }
  const t = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  for(const k of memberKeys) w[k] /= t;
  return w;
}
function looRule(stat, pow){
  const E = [];
  for(const A of dAthletes){
    const tr = derivFolds.filter(f => f.athlete !== A), te = derivFolds.filter(f => f.athlete === A);
    if(!tr.length || !te.length) continue;
    const w = fitRule(tr, stat, pow);          // refit WITHOUT the scored athlete
    for(const f of te){
      let sv = 0, sw = 0;
      for(const k of memberKeys){ const v = f.P[k]; if(w[k] > 0 && v != null && isFinite(v) && v > 0){ sv += v * w[k]; sw += w[k]; } }
      if(sw) E.push(Math.abs(sv / sw - f.actual) / f.actual * 100);
    }
  }
  return E;
}
console.log('\n══ PRIOR DERIVATION (reproduces MODEL-EVIDENCE §2) ══');
console.log(`${derivFolds.length} folds / ${dAthletes.length} athletes\n`);
console.log('member      med%   mean%    n');
for(const k of memberKeys){
  const e = errOf(derivFolds, k);
  console.log(`  ${k.padEnd(9)} ${f1(median(e)).padStart(5)}  ${f1(mean(e)).padStart(6)}  ${String(e.length).padStart(3)}`);
}
console.log('\nrule selection under leave-one-ATHLETE-out (weights refit without the scored athlete):');
console.log('  rule              med%   mean%');
const RULES = [['inv mean^2','mean',2],['inv mean^3','mean',3],['inv median^2','med',2],
  ['inv median^4','med',4],['inv median^6','med',6]];
for(const [name, stat, pow] of RULES){
  const E = looRule(stat, pow);
  console.log(`  ${name.padEnd(16)} ${f1(median(E)).padStart(5)}  ${f1(mean(E)).padStart(6)}`);
}
const shipRule = fitRule(derivFolds, 'med', 4);
console.log('\nshipped rule (inv median^4) fitted on all folds — compare to _ensembleWeights:');
console.log('  ' + memberKeys.map(k => `${k}:${shipRule[k].toFixed(2)}`).join('  '));
// Compare against the DISTANCE FAMILY branch (1500m–10K), which is the branch
// this corpus actually covers. The LONG DISTANCE (10K+) and sprint branches are
// NOT derived from this data — there is barely any of it above 10K and none
// below 800m — so they are deliberately excluded from this lock. Any claim that
// those branches are evidence-derived would be false.
const live = ctx._ensembleWeights(1600, 5000);
console.log('  live distance-family prior (1500m–10K branch) in index.html:');
console.log('  ' + memberKeys.map(k => `${k}:${(live[k] || 0).toFixed(2)}`).join('  '));
// Lock the two together: if someone edits the prior by hand without re-deriving
// it, this fails loudly instead of leaving the evidence doc quietly wrong.
let priorDrift = 0;
for(const k of memberKeys) priorDrift = Math.max(priorDrift, Math.abs((live[k] || 0) - shipRule[k]));
if(priorDrift > 0.08){
  console.error(`ASSERT FAIL shipped prior drifted from its derivation (max |Δw| = ${priorDrift.toFixed(3)} > 0.08).`);
  console.error('  Either re-derive the prior from this output or update MODEL-EVIDENCE-2026-07-30.md §2.');
  process.exitCode = 1;
} else {
  console.log(`  ✓ shipped prior matches its stated derivation (max |Δw| = ${priorDrift.toFixed(3)})`);
}

// ── ABLATION: adaptive stacking ON vs population prior only ──
// Re-runs Mode B with ADAPTIVE_STACKING_ENABLED forced false in a fresh context.
const ablCtx = { Math, console };
vm.createContext(ablCtx);
vm.runInContext(distSrc + '\n' + domainsSrc + '\n' + nudgeFlagSrc + '\n' +
  stackSrc.replace('const ADAPTIVE_STACKING_ENABLED = true;', 'const ADAPTIVE_STACKING_ENABLED = false;') +
  '\n' + NEEDED.map(grab).join('\n') + '\n' + ratiosSrc +
  '\nthis.OBSERVED_RATIOS = OBSERVED_RATIOS;' +
  '\nthis.OBSERVED_RATIO_NUDGE_ENABLED = OBSERVED_RATIO_NUDGE_ENABLED;', ablCtx);
const ablErr = [];
for(const key in groups){
  const marks = Object.values(groups[key]).filter(m => EVNAME[m.distM]);
  if(marks.length < 2) continue;
  for(const target of marks){
    const others = marks.filter(m => m !== target);
    const primary = others[0], additionalPRs = {};
    for(const o of others.slice(1)) additionalPRs[EVNAME[o.distM]] = fmtTimeStr(o.sec);
    const athlete = { name: target.athlete, raceDistance: EVNAME[primary.distM],
      raceDistanceM: primary.distM, raceTime: fmtTimeStr(primary.sec), raceDate: null, additionalPRs };
    const a = ablCtx.nearestAnchorForTarget(athlete, target.distM);
    if(!a) continue;
    if(Math.max(a.distM, target.distM) / Math.min(a.distM, target.distM) < 1.1) continue;
    const f = ablCtx.raceForecastForTarget(athlete, { distM: target.distM, label: EVNAME[target.distM] }, { fixedAnchor: a });
    if(!f || f.isObserved || !isFinite(f.likely)) continue;
    ablErr.push(Math.abs(f.likely - target.sec) / target.sec * 100);
  }
}
console.log('\n══ ABLATION — adaptive per-athlete stacking ══');
console.log(`  stacking ON   median ${f1(median(resB.stride))}  mean ${f1(mean(resB.stride))}  (n=${resB.n})`);
console.log(`  prior only    median ${f1(median(ablErr))}  mean ${f1(mean(ablErr))}  (n=${ablErr.length})`);
const dMed = median(ablErr) - median(resB.stride), dMean = mean(ablErr) - mean(resB.stride);
console.log(`  effect of stacking: median ${dMed >= 0 ? '-' : '+'}${Math.abs(dMed).toFixed(2)}pp, mean ${dMean >= 0 ? '-' : '+'}${Math.abs(dMean).toFixed(2)}pp`);
if(dMed < -0.05 || dMean < -0.05){
  console.log('  ⚠  Stacking is NOT paying for itself on this corpus. It is a heuristic, not a theorem —');
  console.log('     consider ADAPTIVE_STACKING_ENABLED = false until a corpus shows it helps.');
} else {
  console.log('  Note: only folds where an athlete has 3+ remaining PRs can engage stacking at all,');
  console.log('  so a near-zero effect here means "rarely active", not "measured and useless".');
}

// ── 6d. DATA-VALUE CURVE (backs the import-screen guidance; added 2026-07-31) ─
// "How many PRs should I enter, and which events?" — the import panel quotes
// numbers, so the numbers have to be reproducible here, with cohort n attached.
//
// MATCHED COHORTS, and this is the whole methodological point. A naive sweep
// comparing 1-PR folds (all athletes) against 3-PR folds (only athletes who
// race many distances) confounds "more data" with "different, more predictable
// athletes" — it made 3 PRs look far better than it is. Every PR count below is
// scored on the SAME fold set, so the only thing varying is how much of that
// athlete's history the engine was allowed to see.
const dvTargets = [];
for(const key in groups){
  const marks = Object.values(groups[key]).filter(m => EVNAME[m.distM]);
  if(marks.length < 2) continue;
  for(const target of marks){
    const pool = marks.filter(m => m !== target)
      .sort((a, b) => Math.abs(Math.log10(a.distM / target.distM)) - Math.abs(Math.log10(b.distM / target.distM)));
    dvTargets.push({ target, pool, athlete: target.athlete });
  }
}
function dvScore(t, k){
  const others = t.pool.slice(0, k);
  if(others.length < k) return null;
  const primary = others[0], additionalPRs = {};
  for(const o of others.slice(1)) additionalPRs[EVNAME[o.distM]] = fmtTimeStr(o.sec);
  const athlete = { name: t.athlete, raceDistance: EVNAME[primary.distM], raceDistanceM: primary.distM,
    raceTime: fmtTimeStr(primary.sec), raceDate: null, additionalPRs };
  const a = ctx.nearestAnchorForTarget(athlete, t.target.distM);
  if(!a) return null;
  if(Math.max(a.distM, t.target.distM) / Math.min(a.distM, t.target.distM) < 1.1) return null;
  const f = ctx.raceForecastForTarget(athlete, { distM: t.target.distM, label: EVNAME[t.target.distM] }, { fixedAnchor: a });
  if(!f || f.isObserved || !isFinite(f.likely)) return null;
  return Math.abs(f.likely - t.target.sec) / t.target.sec * 100;
}
const pctl = (a, q) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; };
console.log('\n══ DATA-VALUE CURVE — what another PR actually buys (matched cohorts) ══');
const dvResults = {};
for(const K of [2, 3, 4]){
  const elig = dvTargets.filter(t => t.pool.length >= K);
  const series = {};
  let usable = 0;
  for(const t of elig){
    const vals = {}; let ok = true;
    for(let k = 1; k <= K; k++){ const v = dvScore(t, k); if(v == null){ ok = false; break; } vals[k] = v; }
    if(!ok) continue;
    usable++;
    for(let k = 1; k <= K; k++) (series[k] = series[k] || []).push(vals[k]);
  }
  const nAth = new Set(elig.map(t => t.athlete)).size;
  if(usable < 20){
    console.log(`\n  up to ${K} PRs: only ${usable} matched folds / ${nAth} athletes — TOO FEW TO REPORT.`);
    console.log('  Any claim about this many PRs is unsupported by the current corpus.');
    continue;
  }
  console.log(`\n  Cohort: athlete has ≥${K} other PRs — n=${usable} folds, ${nAth} athletes`);
  console.log('   PRs logged   median   mean     p90   within2%');
  for(let k = 1; k <= K; k++){
    const e = series[k];
    console.log(`      ${k}         ${f1(median(e)).padStart(5)}  ${f1(mean(e)).padStart(5)}  ${f1(pctl(e, 0.9)).padStart(5)}     ${(e.filter(x => x <= 2).length / e.length * 100).toFixed(0)}%`);
  }
  dvResults[K] = { n: usable, nAth, series };
}
// The import panel's headline number. Locked so the copy can't drift from it.
const dv2 = dvResults[2];
if(dv2){
  const p90one = pctl(dv2.series[1], 0.9), p90two = pctl(dv2.series[2], 0.9);
  console.log(`\n  → SHIPPED CLAIM: a second PR moves 90th-percentile error ${p90one.toFixed(1)}% → ${p90two.toFixed(1)}%`);
  console.log(`     (n=${dv2.n} matched folds, ${dv2.nAth} athletes). This is the ONLY PR-count claim the`);
  console.log('     corpus supports; beyond 2 PRs there is no measured gain on this data.');
  if(!(p90two < p90one)){
    console.error('ASSERT FAIL the import screen claims a second PR reduces 90th-percentile error; it does not here.');
    process.exitCode = 1;
  }
}
console.log('\n══ DISTANCE SPREAD — which events to pick (observational, not matched) ══');
const dvSpan = {};
for(const t of dvTargets){
  const v = dvScore(t, t.pool.length);
  if(v == null) continue;
  const ds = t.pool.map(o => o.distM).concat(t.target.distM);
  const span = Math.max(...ds) / Math.min(...ds);
  const b = span < 1.5 ? '<1.5x' : span < 2.5 ? '1.5-2.5x' : span < 4 ? '2.5-4x' : '>=4x';
  (dvSpan[b] = dvSpan[b] || []).push(v);
}
console.log('  spread      n     median   mean     p90');
for(const b of ['<1.5x', '1.5-2.5x', '2.5-4x', '>=4x']){
  const e = dvSpan[b];
  if(!e || !e.length) continue;
  console.log(`  ${b.padEnd(10)} ${String(e.length).padStart(3)}   ${f1(median(e)).padStart(5)}  ${f1(mean(e)).padStart(5)}  ${f1(pctl(e, 0.9)).padStart(5)}`);
}
console.log('  NOTE: cohorts here are different athletes, not the same athlete with more data —');
console.log('  read as "rosters that look like this predict better", not "widen your spread and improve".');

// ── 7. Verdict ──
const sMed = median(res.stride), rMed = median(res.riegel);
const better = sMed < rMed;
const margin = ((rMed - sMed) / rMed * 100);
console.log('\n══ VERDICT ══');
if(res.n < 30){
  console.log(`⚠  Only ${res.n} pairs — too few to claim statistical superiority. Need the MileSplit/TFRRS`);
  console.log('   data rebuild (roadmap C3) to backtest at scale before the moat claim is defensible.');
} else if(better && margin > 5){
  console.log(`✓  StrideOS median error ${sMed.toFixed(1)}% vs Riegel ${rMed.toFixed(1)}% — ${margin.toFixed(0)}% relative improvement.`);
  console.log('   On THIS sample the engine genuinely beats the commodity formula. Expand to confirm.');
} else if(better){
  console.log(`~  StrideOS edges Riegel (${sMed.toFixed(1)}% vs ${rMed.toFixed(1)}%) but the margin is thin (${margin.toFixed(0)}%).`);
  console.log('   Not yet a defensible "superior predictor" claim — calibrate + expand the dataset.');
} else {
  console.log(`✗  StrideOS (${sMed.toFixed(1)}%) does NOT beat Riegel (${rMed.toFixed(1)}%) on this sample.`);
  console.log('   The moat is the ROSTER/lineup workflow, not raw single-pair accuracy. Lead with that.');
}
console.log('');
