// Engine probes — unit-level oracles for the pure analysis functions in
// index.html (Model Arbitration, Critical Speed + D′, Race Shape Reader).
// Extraction-based: pulls the named functions/consts out of the inline script
// by brace-matching, composes them with `new Function`, and asserts on
// synthetic athletes with known-exact answers. Run: node tests/engine-probes.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function extractBlock(startIdx, openChar, closeChar){
  let depth = 0, i = startIdx;
  for(; i < html.length; i++){
    if(html[i] === openChar) depth++;
    else if(html[i] === closeChar){ depth--; if(depth === 0) return html.slice(startIdx, i + 1); }
  }
  throw new Error('unbalanced block at ' + startIdx);
}
function extractFn(name){
  const sig = `function ${name}(`;
  const at = html.indexOf(sig);
  if(at < 0) throw new Error(`function ${name} not found`);
  const bodyStart = html.indexOf('{', at);
  const header = html.slice(at, bodyStart);
  return header + extractBlock(bodyStart, '{', '}');
}
function extractConst(name, open = '{', close = '}'){
  const sig = `const ${name} = ${open}`;
  const at = html.indexOf(sig);
  if(at < 0) throw new Error(`const ${name} not found`);
  const start = at + sig.length - 1;
  return `const ${name} = ` + extractBlock(start, open, close) + ';';
}

const src = [
  extractConst('DIST'),
  extractConst('LEDGER_MODELS', '[', ']'),
  extractFn('parseTime'),
  extractFn('collectAllPRs'),
  extractFn('computeCriticalSpeed'),
  extractFn('parseSplitList'),
  extractFn('computeRaceShape'),
  extractFn('computeModelArbitration'),
  extractFn('_formulaRiegel'),
  extractFn('_formulaCameron'),
  extractFn('_formulaVDOT'),
  extractFn('_formulaPurdy'),
  extractFn('_formulaVickersVertosick'),
  `return { parseTime, collectAllPRs, computeCriticalSpeed, parseSplitList,
    computeRaceShape, computeModelArbitration, _formulaRiegel, _formulaCameron,
    _formulaVDOT, _formulaPurdy, _formulaVickersVertosick, DIST };`
].join('\n');
const E = new Function(src)();

let passed = 0;
function ok(cond, msg){
  if(!cond) throw new Error('PROBE FAIL: ' + msg);
  passed++;
}
const close = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg} (got ${a}, want ${b}±${tol})`);

// ── parseTime ──
ok(E.parseTime('75') === 75, "parseTime bare seconds");
ok(E.parseTime('1:15') === 75, "parseTime m:ss");
ok(E.parseTime('16:43') === 1003, "parseTime long");
ok(E.parseTime('abc') === null, "parseTime garbage → null");

// ── Formula sanity (fixed anchors, published behavior) ──
close(E._formulaRiegel(1600, 300, 3200), 300 * Math.pow(2, 1.06), 0.01, "Riegel doubling");
const cam = E._formulaCameron(1600, 300, 3200);
ok(cam > 550 && cam < 700 && cam > 300, `Cameron 1600→3200 plausible (got ${cam})`);
const vd = E._formulaVDOT(1600, 300, 3200);
ok(vd > 550 && vd < 700, `VDOT 1600→3200 plausible (got ${vd})`);
const pu = E._formulaPurdy(1600, 300, 3200);
ok(pu > 550 && pu < 700, `Purdy 1600→3200 plausible (got ${pu})`);
// Vickers-Vertosick: low weekly volume must predict a SLOWER marathon than high volume.
const vvLow = E._formulaVickersVertosick(5000, 1200, 42195, 20);
const vvHigh = E._formulaVickersVertosick(5000, 1200, 42195, 70);
ok(vvLow > vvHigh, `V-V volume-aware (low ${vvLow} > high ${vvHigh})`);

// ── Critical Speed: marks constructed EXACTLY on d = 4.0·t + 200 ──
// DIST-aware: times derived from the live DIST values so the line is exact
// regardless of whether 1600m is stored as 1600 or 1609.34.
const d800 = E.DIST['800m'], d1600 = E.DIST['1600m'], d3200 = E.DIST['3200m'];
ok(d800 > 0 && d1600 > 0 && d3200 > 0, "DIST has 800m/1600m/3200m");
const t = d => (d - 200) / 4.0;                       // seconds on the exact line
const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
// Round-safe: use whole-second times ON the line by nudging D' — instead assert
// with tolerance wide enough for mm:ss rounding (±1s per mark → cs tol .05).
const lineAthlete = {
  id: 'probe1', name: 'Probe Kid',
  raceDistance: '1600m', raceTime: fmt(t(d1600)),
  additionalPRs: { '800m': fmt(t(d800)), '3200m': fmt(t(d3200)) }
};
const cs = E.computeCriticalSpeed(lineAthlete);
ok(cs !== null, "CS computes with 3 marks");
close(cs.cs, 4.0, 0.05, "CS slope recovers 4.0 m/s");
close(cs.dPrime, 200, 40, "D' recovers ~200m");
ok(cs.r2 > 0.999, `CS R² near 1 on a straight line (got ${cs.r2})`);
ok(cs.n === 3, "CS used all 3 admissible efforts");
ok(!cs.flags.some(f => /Two-point/.test(f)), "no two-point flag with 3 marks");
// Guards: single PR → null; sprint marks (<2 min) filtered → null.
ok(E.computeCriticalSpeed({ id: 'x', raceDistance: '1600m', raceTime: '5:00', additionalPRs: {} }) === null, "CS null with 1 PR");
ok(E.computeCriticalSpeed({ id: 'x', raceDistance: '100m', raceTime: '12', additionalPRs: { '200m': '25' } }) === null, "CS null when all marks under 2 min");
// Two-point fit flags itself.
const cs2 = E.computeCriticalSpeed({ id: 'x', raceDistance: '1600m', raceTime: fmt(t(d1600)), additionalPRs: { '800m': fmt(t(d800)) } });
ok(cs2 && cs2.flags.some(f => /Two-point/.test(f)), "two-point fit is flagged");

// ── Race Shape ──
const fade = E.computeRaceShape([70, 72, 75, 80]);
ok(fade.patternKey === 'fade', "hot-early race reads as positive split");
ok(fade.kickKey === 'nokick', "slowest-last race reads as no close");
const neg = E.computeRaceShape([80, 76, 74, 70]);
ok(neg.patternKey === 'negative', "descending race reads as negative split");
ok(neg.kickKey === 'kick', "fast last split reads as real kick");
const even = E.computeRaceShape([75, 75, 75, 75]);
ok(even.patternKey === 'even' && even.kickKey === 'steady', "flat race reads even/steady");
ok(E.computeRaceShape([75]) === null, "single split → null");
const odd = E.computeRaceShape([70, 80, 90]);
ok(odd.patternKey === 'fade', "odd split count still classifies (middle excluded)");
close(fade.total, 297, 1e-9, "race total is the sum of splits");
// parseSplitList mixed formats
const pl = E.parseSplitList('75, 1:15\n80');
ok(pl.length === 3 && pl[0] === 75 && pl[1] === 75 && pl[2] === 80, "split list parses mixed formats");
ok(E.parseSplitList('abc def').length === 0, "garbage splits parse to empty");

// ── Race Shape adversarial cases (review cycle-1 findings) ──
// Slow-ish final but a MIDDLE split is the slowest → must not claim "slowest".
const midSlow = E.computeRaceShape([70, 85, 80]);
ok(midSlow.kickKey === 'steady', "final split near average with slow middle → steady, no false 'no close'");
// Final split below average but SLOWER than the penultimate → not a kick.
const noAccel = E.computeRaceShape([95, 70, 75]);
ok(noAccel.closePct <= -3, "sanity: final split is well under race average");
ok(noAccel.kickKey !== 'kick', "below-average close without acceleration is NOT a kick");
// Final split ≥3% over average but NOT the race's slowest → 'slow finish' wording, no 'slowest' claim.
const slowNotSlowest = E.computeRaceShape([60, 100, 90]);
ok(slowNotSlowest.kickKey === 'nokick' && !/slowest/.test(slowNotSlowest.kick),
  "over-average close that isn't the slowest split never claims 'slowest'");
ok(slowNotSlowest.lastIsSlowest === false, "lastIsSlowest flag correct");
// Genuinely slowest final split → the 'slowest' wording IS used.
const fadeAgain = E.computeRaceShape([70, 72, 75, 80]);
ok(fadeAgain.kickKey === 'nokick' && /slowest/.test(fadeAgain.kick),
  "a true slowest-last-split race says so");
// Kick still requires BOTH below-average close AND acceleration vs the previous split.
const realKick = E.computeRaceShape([80, 76, 74, 70]);
ok(realKick.kickKey === 'kick', "descending finish with acceleration is still a kick");

// ── Model Arbitration ──
const row = (name, errs, id) => ({ athleteId: id || name, name,
  strideErr: errs[0], riegelErr: errs[1], vdotErr: errs[2],
  cameronErr: errs[3], purdyErr: errs[4], vvErr: errs[5] });
const rows = [
  row('X', [2, 1, 3, null, 4, 5]),
  row('X', [2.5, 1.2, 3.1, 6, 4.4, 5.5]),
  row('X', [2.2, 0.9, 3.3, 5, 4.1, 5.2]),
  row('Y', [1, 2, 3, 4, 5, 6]),               // single row → Y excluded from per-athlete list
];
const arb = E.computeModelArbitration(rows);
ok(arb.athletes.length === 1 && arb.athletes[0].name === 'X', "single-test athletes are not ranked");
ok(arb.athletes[0].best.key === 'riegelErr', "best model per athlete = lowest mean error");
// Comparability control: X's row 1 has an abstaining Cameron, so rankings for
// X must be computed on the 2 rows every candidate scored — same tests for all.
ok(arb.athletes[0].comparableTests === 2, "ranking uses only the rows all candidate models scored");
ok(arb.athletes[0].ranking.every(m => m.n === 2), "every ranked model scored on the identical test set");
const camPanel = arb.panel.find(m => m.key === 'cameronErr');
ok(camPanel.n === 3, "abstained rows (null) are excluded from a model's n, not scored as misses");
const riegelPanel = arb.panel.find(m => m.key === 'riegelErr');
ok(riegelPanel.wins === 3, "roster-wide wins counted for the per-row winner");
// n≥2 rule inside one athlete's ranking: purdy present once for Z → not rankable for Z.
const zRows = [ row('Z', [2, 3, 4, 5, 1, 6]), row('Z', [2, 3, 4, 5, null, 6]) ];
const zArb = E.computeModelArbitration(zRows);
ok(zArb.athletes.length === 1 && !zArb.athletes[0].ranking.some(m => m.key === 'purdyErr'),
  "a model with <2 scored tests on an athlete is not ranked for that athlete");
// Duplicate names, different IDs → two separate rankings, never merged.
const dupRows = [
  row('Jordan Smith', [1, 2, 3, 4, 5, 6], 'id-A'),
  row('Jordan Smith', [1, 2, 3, 4, 5, 6], 'id-A'),
  row('Jordan Smith', [3, 1, 2, 4, 5, 6], 'id-B'),
  row('Jordan Smith', [3, 1, 2, 4, 5, 6], 'id-B'),
];
const dupArb = E.computeModelArbitration(dupRows);
ok(dupArb.athletes.length === 2, "same-name athletes with different IDs are ranked separately");
ok(dupArb.athletes.some(a => a.best.key === 'strideErr') && dupArb.athletes.some(a => a.best.key === 'riegelErr'),
  "each same-name athlete keeps their own best model");

// ── Tested-threshold privacy wiring (source-level oracles) ──
const clearDBsrc = extractFn('clearDB');
ok(clearDBsrc.includes('strideos_tested_thresholds'), "clearDB wipes the tested-threshold side map");
const delAthSrc = extractFn('deleteAthlete');
ok(delAthSrc.includes('setTestedThreshold'), "deleteAthlete removes the athlete's tested threshold");
const exportSrc = extractFn('exportMyData');
ok(exportSrc.includes('tested_thresholds'), "exportMyData includes device-local tested thresholds");
// Behavioral roundtrip with a stubbed localStorage.
const ttSrc = [
  `const TESTED_THRESHOLD_KEY = 'strideos_tested_thresholds';`,
  extractFn('getTestedThreshold'),
  extractFn('setTestedThreshold'),
  `return { getTestedThreshold, setTestedThreshold };`
].join('\n');
const store = new Map();
const lsStub = { getItem: k => store.has(k) ? store.get(k) : null,
  setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const TT = new Function('localStorage', ttSrc)(lsStub);
TT.setTestedThreshold('kid-1', '6:45');
ok(TT.getTestedThreshold('kid-1') === '6:45', "tested threshold set/get roundtrip");
TT.setTestedThreshold('kid-1', '');
ok(TT.getTestedThreshold('kid-1') === null, "empty save removes the athlete's entry");

// ── Honest model labels ──
const models = new Function(extractConst('LEDGER_MODELS', '[', ']') + '; return LEDGER_MODELS;')();
const vvModel = models.find(m => m.key === 'vvErr');
ok(/after Vickers-Vertosick/.test(vvModel.label), "V-V heuristic is not presented as the published model");
const purdyModel = models.find(m => m.key === 'purdyErr');
ok(/STRIDE/.test(purdyModel.label), "Purdy-style curve is labeled as a STRIDE heuristic");

console.log(`engine probes ok — ${passed} assertions`);
