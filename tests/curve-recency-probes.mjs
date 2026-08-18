// Pure-function probes for the recency-weighted Performance Curve
// (Alex call 2026-08-17: "the orange curve should be based on current data").
// Covers: freshness weights, the weighted median (incl. equal-weight
// equivalence with _med), and per-event PR date resolution in collectAllPRs.
// Run: node tests/curve-recency-probes.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function extractBlock(startIdx, openChar, closeChar){
  let depth = 0;
  for(let i=startIdx;i<html.length;i++){
    if(html[i] === openChar) depth++;
    else if(html[i] === closeChar){ depth--; if(depth === 0) return html.slice(startIdx,i+1); }
  }
  throw new Error('unbalanced block');
}
function extractFn(name){
  const sig = `function ${name}(`;
  const at = html.indexOf(sig);
  if(at < 0) throw new Error(`function ${name} not found`);
  const body = html.indexOf('{',at);
  return html.slice(at,body) + extractBlock(body,'{','}');
}
const distAt = html.indexOf('const DIST = {');
if(distAt < 0) throw new Error('DIST not found');
const distSrc = 'const DIST = ' + extractBlock(html.indexOf('{', distAt), '{', '}') + ';';

const src = [
  distSrc,
  extractFn('parseTime'),
  extractFn('_daysSinceRace'),
  extractFn('prFreshness'),
  extractFn('_med'),
  extractFn('freshnessWeightFor'),
  extractFn('_weightedMed'),
  extractFn('collectAllPRs'),
  `return { parseTime, prFreshness, _med, freshnessWeightFor, _weightedMed, collectAllPRs };`
].join('\n');
const E = new Function(src)();

let n = 0;
function ok(value,message){ if(!value) throw new Error(`PROBE FAIL: ${message}`); n++; }
function eq(actual,want,message){ ok(actual === want, `${message} (got ${JSON.stringify(actual)}, want ${JSON.stringify(want)})`); }

// ── Freshness weights ──
eq(E.freshnessWeightFor('fresh'),   1.0, 'fresh mark carries full weight');
eq(E.freshnessWeightFor('stale'),   0.6, 'stale mark fades');
eq(E.freshnessWeightFor('expired'), 0.3, 'expired mark is context only');
eq(E.freshnessWeightFor('future'),  0,   'future-dated mark never steers');
eq(E.freshnessWeightFor('unknown'), 0.5, 'undated mark weighs neutral');

// ── Weighted median ──
// Equal weights must reproduce _med exactly — odd and even counts.
eq(E._weightedMed([100,110,120].map(v=>({v,w:1}))), E._med([100,110,120]),
  'equal weights, odd count == _med');
eq(E._weightedMed([100,110,120,130].map(v=>({v,w:1}))), E._med([100,110,120,130]),
  'equal weights, even count == _med (middle-pair average)');
// A fresh mark out-votes two old ones: the median lands ON the fresh value.
eq(E._weightedMed([{v:100,w:1},{v:110,w:0.3},{v:120,w:0.3}]), 100,
  'one fresh anchor out-votes two expired anchors');
// Symmetric: fresh slow mark drags the consensus slower too — no optimism bias.
eq(E._weightedMed([{v:100,w:0.3},{v:110,w:0.3},{v:120,w:1}]), 120,
  'recency weighting works in both directions');
// Order-independence.
eq(E._weightedMed([{v:120,w:0.3},{v:100,w:1},{v:110,w:0.3}]), 100,
  'weighted median is input-order independent');

// ── collectAllPRs per-event date resolution ──
const base = {
  raceDistance: '5K', raceDistanceM: 5000, raceTime: '16:30', raceDate: '2026-08-01',
};
// 1. Coach-entered date wins.
let prs = E.collectAllPRs({ ...base,
  additionalPRs: { '1600m': '4:45' },
  additionalPRDates: { '1600m': '2026-07-15' },
  raceHistory: [{ event:'1600m', distM:1609, sec: 285, date:'2025-01-01' }],
});
eq(prs.find(p=>p.event==='1600m').raceDate, '2026-07-15', 'coach-entered PR date wins over history');
// 2. No coach date → dated history run matching the PR time stands in.
prs = E.collectAllPRs({ ...base,
  additionalPRs: { '1600m': '4:45' },
  raceHistory: [
    { event:'1600m', sec: 285.2, date:'2026-05-10' },   // the PR run (within 0.5s)
    { event:'1600m', sec: 292,   date:'2026-06-20' },   // slower later race — must NOT date the PR
  ],
});
eq(prs.find(p=>p.event==='1600m').raceDate, '2026-05-10', 'history date attaches only via the run that produced the PR');
// 3. No date anywhere → honest null (weighs neutral, never "current").
prs = E.collectAllPRs({ ...base, additionalPRs: { '800m': '2:10' } });
eq(prs.find(p=>p.event==='800m').raceDate, null, 'undated additional PR stays undated');
// 4. Primary PR keeps its own date.
eq(prs.find(p=>p.event==='5K').raceDate, '2026-08-01', 'primary PR date unchanged');

console.log(`curve recency probes ok — ${n} probes`);
