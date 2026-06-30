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
  '_formulaPurdy', '_ensembleWeights', 'strideEnsemble', 'getEventDomain',
  'getObservedRatio', 'sameDistanceM',
];
const distSrc    = (html.match(/const DIST = \{[\s\S]*?\};/) || [''])[0];
const domainsSrc = (html.match(/const EVENT_DOMAINS = \{[\s\S]*?\};/) || [''])[0];
const ratiosSrc  = (html.match(/const OBSERVED_RATIOS = \{[\s\S]*?\};/) || [''])[0];
const ctx = { Math, console };
vm.createContext(ctx);
vm.runInContext(distSrc + '\n' + domainsSrc + '\n' + NEEDED.map(grab).join('\n') + '\n' + ratiosSrc +
  '\nthis.OBSERVED_RATIOS = OBSERVED_RATIOS;', ctx);

// StrideOS predicted time at d2 (m) from time t1 (s) at d1 (m):
const stridePred = (d1, t1, d2) => ctx.strideEnsemble(d1, t1, d2, 1.0, {}).predSec;
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
const res = { stride: [], riegel: [], strideWins: 0, ties: 0, n: 0, byDomain: {} };
for(const p of pairs){
  const sPred = stridePred(p.from.distM, p.from.sec, p.to.distM);
  const rPred = riegelPred(p.from.distM, p.from.sec, p.to.distM);
  if(!isFinite(sPred) || sPred <= 0) continue;
  const sErr = absPctErr(sPred, p.to.sec);
  const rErr = absPctErr(rPred, p.to.sec);
  res.stride.push(sErr); res.riegel.push(rErr); res.n++;
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

console.log('\n══ STRIDE OS MOAT BACKTEST — held-out real races ══');
console.log(`Athletes/seasons with ≥2 distinct track events → ${res.n} held-out prediction pairs\n`);
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
