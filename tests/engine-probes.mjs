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
  // Preserve `async` — matching bare `function name(` inside `async function
  // name(` silently drops the keyword and breaks any `await` in the body.
  const asyncSig = `async function ${name}(`;
  const sig = html.indexOf(asyncSig) >= 0 ? asyncSig : `function ${name}(`;
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
  extractFn('ledgerAthleteKey'),
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

// ── Tested-threshold privacy (EXECUTED behavior, stubbed browser surface) ──
const mkStore = () => {
  const store = new Map();
  return { store, ls: { getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) } };
};
// set/get roundtrip.
const ttSrc = [
  `const TESTED_THRESHOLD_KEY = 'strideos_tested_thresholds';`,
  extractFn('getTestedThreshold'),
  extractFn('setTestedThreshold'),
  `return { getTestedThreshold, setTestedThreshold };`
].join('\n');
{
  const { ls } = mkStore();
  const TT = new Function('localStorage', ttSrc)(ls);
  TT.setTestedThreshold('kid-1', '6:45');
  ok(TT.getTestedThreshold('kid-1') === '6:45', "tested threshold set/get roundtrip");
  TT.setTestedThreshold('kid-1', '');
  ok(TT.getTestedThreshold('kid-1') === null, "empty save removes the athlete's entry");
}
// clearDB: EXECUTED — must remove both the main DB and the threshold side map.
{
  const { store, ls } = mkStore();
  store.set('strideos_db', '{"athletes":[]}');
  store.set('strideos_tested_thresholds', '{"kid-1":"6:45"}');
  const src = [`const KEY = 'strideos_db'; let _mem = { seeded: true };`,
    extractFn('clearDB'), `return clearDB;`].join('\n');
  new Function('localStorage', src)(ls)();
  ok(!store.has('strideos_db'), "clearDB removes the main DB (executed)");
  ok(!store.has('strideos_tested_thresholds'), "clearDB removes tested thresholds (executed)");
}
// deleteAthlete: EXECUTED — roster, workouts, and the athlete's threshold all go;
// other athletes' thresholds survive.
{
  const { store, ls } = mkStore();
  store.set('strideos_tested_thresholds', JSON.stringify({ 'kid-1': '6:45', 'kid-2': '7:10' }));
  const src = [
    `let DB = { athletes: [{ id: 'kid-1', name: 'A' }, { id: 'kid-2', name: 'B' }],
       workouts: [{ athleteId: 'kid-1' }, { athleteId: 'kid-2' }], activeAthleteId: 'kid-1' };`,
    `const requireCoachWorkspace = () => true; const confirm = () => true;`,
    `const saveDB = () => {}; const softDeleteRemoteAthlete = () => {};`,
    `const refreshActiveAthlete = () => {}; const updateChip = () => {};`,
    `const currentScreen = 'roster'; const renderRoster = () => {};`,
    `const goTo = () => {}; const toast = () => {};`,
    `const TESTED_THRESHOLD_KEY = 'strideos_tested_thresholds';`,
    extractFn('getTestedThreshold'),
    extractFn('setTestedThreshold'),
    extractFn('deleteAthlete'),
    `return { del: id => deleteAthlete(id), db: () => DB };`
  ].join('\n');
  const H = new Function('localStorage', src)(ls);
  H.del('kid-1');
  ok(H.db().athletes.length === 1 && H.db().athletes[0].id === 'kid-2', "deleteAthlete removes the athlete (executed)");
  ok(H.db().workouts.every(w => w.athleteId !== 'kid-1'), "deleteAthlete removes the athlete's workouts (executed)");
  const after = JSON.parse(store.get('strideos_tested_thresholds'));
  ok(!('kid-1' in after), "deleteAthlete removes that athlete's tested threshold (executed)");
  ok(after['kid-2'] === '7:10', "other athletes' tested thresholds survive deletion");
}
// exportMyData: EXECUTED — the downloaded JSON must carry cloud data AND
// device_local.tested_thresholds.
{
  const { store, ls } = mkStore();
  store.set('strideos_tested_thresholds', JSON.stringify({ 'kid-1': '6:45' }));
  let captured = null;
  class BlobStub { constructor(parts){ captured = parts.join(''); } }
  const documentStub = {
    getElementById: () => null,
    createElement: () => ({ click(){}, remove(){}, set href(_v){}, set download(_v){} }),
    body: { appendChild(){} }
  };
  const src = [
    `const sbClient = { rpc: async () => ({ data: { coach: { email: 'x@y.z' } }, error: null }) };`,
    `const sbUser = { id: 'coach-1' }; const toast = () => {};`,
    `const setTimeout = (fn) => {};`,
    extractFn('exportMyData'),
    `return exportMyData;`
  ].join('\n');
  const run = new Function('localStorage', 'document', 'Blob', 'URL', src)(
    ls, documentStub, BlobStub, { createObjectURL: () => 'blob:x', revokeObjectURL(){} });
  await run();
  ok(captured !== null, "exportMyData produced a download blob (executed)");
  const exported = JSON.parse(captured);
  ok(exported.device_local && exported.device_local.tested_thresholds['kid-1'] === '6:45',
    "export includes device_local.tested_thresholds (executed)");
  ok(exported.coach && exported.coach.email === 'x@y.z', "export still carries the cloud payload");
}

// ── Ledger identity: headline count keys by athlete ID ──
const keyFn = new Function(extractFn('ledgerAthleteKey') + '; return ledgerAthleteKey;')();
const sameName = [{ athleteId: 'id-A', name: 'Jordan Smith' }, { athleteId: 'id-B', name: 'Jordan Smith' }];
ok(new Set(sameName.map(keyFn)).size === 2, "same-name different-ID athletes count as two");
ok(new Set([{ athleteId: 'id-A', name: 'J' }, { athleteId: 'id-A', name: 'J' }].map(keyFn)).size === 1,
  "same athlete never double-counts");
// And the ledger's headline count actually uses that key rule.
const ledgerSrc = extractFn('computeProofLedger');
ok(/athletes:\s*new Set\(rows\.map\(ledgerAthleteKey\)\)/.test(ledgerSrc),
  "computeProofLedger's athlete count is keyed by ledgerAthleteKey");

// ── Honest model labels ──
const models = new Function(extractConst('LEDGER_MODELS', '[', ']') + '; return LEDGER_MODELS;')();
const vvModel = models.find(m => m.key === 'vvErr');
ok(/after Vickers-Vertosick/.test(vvModel.label), "V-V heuristic is not presented as the published model");
const purdyModel = models.find(m => m.key === 'purdyErr');
ok(/STRIDE/.test(purdyModel.label), "Purdy-style curve is labeled as a STRIDE heuristic");


// ══ CRITICAL VELOCITY / TINMAN FAMILY (added 2026-07-30) ══
const cvSrc = [extractFn('_csDamp'), extractFn('_csUndamp'), extractFn('_fitCriticalVelocity'),
  extractFn('_formulaCriticalVelocity'), extractFn('_formulaTinmanCV'), extractFn('_formulaPersonalK'),
  extractFn('sameDistanceM')].join('\n');
const CVF = new Function(cvSrc + '; return {_csDamp,_csUndamp,_fitCriticalVelocity,_formulaCriticalVelocity,_formulaTinmanCV,_formulaPersonalK};')();

// The long-duration damping must be exactly invertible — otherwise an anchor
// over 30 min yields a different CV than the same fitness would from a 5K.
ok(Math.abs(CVF._csUndamp(CVF._csDamp(2400)) - 2400) < 0.5, "_csDamp/_csUndamp round-trip");
ok(CVF._csDamp(1500) === 1500, "_csDamp is identity below 30 min");
ok(CVF._csDamp(3600) > 3600, "_csDamp slows predictions beyond 30 min");

// Two-parameter fit on a textbook CS athlete: CV = 5.0 m/s, D' = 200 m.
// t = (d - 200)/5  →  1500m in 260s, 5000m in 960s.
const synth = [{ distM: 1500, sec: 260 }, { distM: 5000, sec: 960 }];
const fit = CVF._fitCriticalVelocity(synth);
ok(fit && Math.abs(fit.cv - 5.0) < 0.01, "CV recovered from exact CS data");
ok(fit && Math.abs(fit.dprime - 200) < 1, "D' recovered from exact CS data");
const cvPred = CVF._formulaCriticalVelocity(synth, 3000);
ok(cvPred && Math.abs(cvPred - 560) < 1, "CV model predicts 3000m from its own curve");

// Abstention discipline: a model that cannot speak must return null, never a
// number — the ledger scores nulls as "excluded", but a junk number as a miss.
ok(CVF._formulaCriticalVelocity(synth, 200) === null, "CV abstains at sprint distances");
ok(CVF._fitCriticalVelocity([{distM:1500,sec:260}]) === null, "CV needs 2+ PRs");
ok(CVF._fitCriticalVelocity([{distM:1500,sec:260},{distM:1600,sec:278}]) === null,
  "CV abstains when both PRs are near-identical distances (no lever arm)");
ok(CVF._fitCriticalVelocity([{distM:1500,sec:600},{distM:5000,sec:610}]) === null,
  "CV abstains on physiologically impossible fits");
ok(CVF._formulaTinmanCV(200, 24, 400) === null, "Tinman CV abstains inside the D' reserve");
const tin = CVF._formulaTinmanCV(5000, 960, 3000);
ok(tin > 500 && tin < 620, "Tinman CV gives a sane 5K→3000m");

// personal-k stays inside published human bounds and fades outside its span
ok(CVF._formulaPersonalK([{distM:1500,sec:260},{distM:5000,sec:960}], 5000, 960, 3000) > 0,
  "personal-k predicts inside its measured span");
ok(CVF._formulaPersonalK([{distM:1500,sec:260}], 1500, 260, 5000) === null,
  "personal-k needs 2+ PRs at 400m+");

// ══ ADAPTIVE STACKING — leakage is the thing that would make the ledger a lie ══
const loo = extractFn('_memberLooErrors');
ok(/prs\.filter\(p => !sameDistanceM\(p\.distM, target\.distM\)\)/.test(loo),
  "_memberLooErrors excludes the held-out PR from its own fitting set");
const fcast = extractFn('raceForecastForTarget');
ok(/collectAllPRs\(athlete\)\.filter\(p => !sameDistanceM\(p\.distM, targetDistM\)\)/.test(fcast),
  "the shipped forecast never lets a target distance into its own stacking set");
ok(!/likely = personalPrediction \* personalW/.test(fcast),
  "personal-k no longer overrides the ensemble downstream (it competes as a member)");
const ens = extractFn('strideEnsemble');
ok(/liveKeys\.reduce\(\(s, k\) => s \+ weights\[k\], 0\)/.test(ens),
  "abstaining members trigger weight renormalization, not a shrunken prediction");

// ══ LEDGER STATISTICAL HONESTY ══
const ci = new Function(extractFn('_bootstrapPairedCI') + '; return _bootstrapPairedCI;')();
const cl = (...groups) => groups.map((diffs, i) => ({ key: 'a' + i, diffs }));
// The screenshot's shape: 3 tests, ONE athlete.
const three = cl([2.6, -1.0, 0.4]);
ok(ci(three).separable === false, "a 3-test gap is reported as NOT statistically separable");
ok(ci(three).nAthletes === 1, "the interval knows how many independent athletes it saw");
const a = ci(three), b = ci(three);
ok(a.lo === b.lo && a.hi === b.hi, "the confidence interval is deterministic across renders");
ok(ci([]) .n === 0, "no clusters yields no tests");
ok(ci(cl([1])).separable === false, "a single test never separates");

// PSEUDOREPLICATION REGRESSION — the whole reason the bootstrap clusters.
// One athlete, twelve consistent hold-out tests. Resampling tests individually
// would call this a significant win; clustering on athletes must not.
const oneAthleteManyTests = cl([1.4,1.5,1.3,1.6,1.4,1.5,1.5,1.3,1.6,1.4,1.5,1.4]);
const oneAth = ci(oneAthleteManyTests);
ok(oneAth.n === 12 && oneAth.nAthletes === 1, "12 tests from 1 athlete counted as 1 cluster");
ok(oneAth.separable === false,
  "12 tests from ONE athlete cannot manufacture significance (pseudoreplication guard)");
// The same 12 differences spread across 6 athletes SHOULD be able to separate.
const sixAthletes = cl([1.4,1.5],[1.3,1.6],[1.4,1.5],[1.5,1.3],[1.6,1.4],[1.5,1.4]);
ok(ci(sixAthletes).nAthletes === 6, "clusters counted per athlete");
ok(ci(sixAthletes).separable === true,
  "a consistent margin across 6 independent athletes IS separable");

const verdict = new Function('const _LEDGER_MIN_N_FOR_VERDICT = 8;' +
  'const _LEDGER_MIN_ATHLETES_FOR_VERDICT = 3;' +
  extractFn('_bootstrapPairedCI') + extractFn('_ledgerVerdict') + '; return _ledgerVerdict;')();
ok(verdict('Riegel', three).tone === 'neutral', "thin samples are toned neutral");
ok(verdict('Riegel', three).underpowered === true, "a 3-test sample is flagged underpowered");
// The floor must bind in OUR favour too: three lopsided wins are still 3 tests.
ok(verdict('Riegel', cl([3.0, 3.2, 2.9])).tone !== 'win',
  "STRIDE cannot claim a statistical win on 3 tests either — the floor is symmetric");
ok(/cannot settle it|aren't independent/.test(verdict('Riegel', cl([3.0,3.2,2.9])).text),
  "underpowered samples say so in plain language");
// …and the athlete floor binds even when the TEST floor is satisfied.
ok(verdict('Riegel', oneAthleteManyTests).tone === 'neutral',
  "12 tests from one athlete still yields no verdict (athlete floor)");
ok(/aren't independent/.test(verdict('Riegel', oneAthleteManyTests).text),
  "the one-athlete case explains WHY it can't be settled");
const strongSpread = cl([1.5,1.6,1.4],[1.5,1.5,1.6],[1.4,1.5,1.5],[1.6,1.4,1.5]);
ok(verdict('Riegel', strongSpread).tone === 'win', "a real margin over 4 athletes is reported as a win");
ok(verdict('Riegel', strongSpread.map(g => ({...g, diffs: g.diffs.map(x => -x)}))).tone === 'loss',
  "a real deficit is reported as a loss, not hidden");

// ══ NO WINNER BADGE WITHOUT THE SAME EVIDENCE AS THE PROSE ══
// Codex review 2026-07-30: gating only the sentence while ★ / "best model" /
// green highlights still ran off raw MAPE left the original overclaim intact.
const rp = extractFn('renderProof');
ok(/const strideBest = sweepsAll;/.test(rp),
  "the STRIDE ★ is driven by the bootstrap sweep, not by raw MAPE comparison");
ok(!/p\.strideMape <= p\.riegelMape/.test(rp),
  "no raw-MAPE 'strideBest' comparison survives in renderProof");
ok(/sweepsAll = shown\.length > 0 && provenWins\.length === shown\.length/.test(rp),
  "'most accurate model' requires being proven ahead of EVERY displayed competitor");
ok(/bar\('Riegel \(1977\)', p\.riegelMape, 'var\(--yellow\)', V\.riegel && V\.riegel\.tone === 'loss'\)/.test(rp),
  "a rival only gets the ★ when it is a PROVEN loss for STRIDE, not a raw-MAPE lead");
ok(/i===0&&panelRankable/.test(rp),
  "the full-model-panel ★ is gated on sample adequacy");
ok(/!smallSample&&r\.strideErr<=r\.riegelErr/.test(rp),
  "per-row green 'STRIDE closest' highlighting is gated on sample adequacy");
ok(/smallSample = p\.n < _LEDGER_MIN_N_FOR_VERDICT \|\| p\.athletes < _LEDGER_MIN_ATHLETES_FOR_VERDICT/.test(rp),
  "sample adequacy counts athletes, not just tests");
ok(!/color:\$\{a\.best\.key==='strideErr'\?'var\(--green\)'/.test(rp),
  "per-athlete 'best model' no longer gets a winner colour off 2-4 tests");

// The ledger's verdicts must be built from athlete-clustered differences.
ok(/_clusterDiffs\(rows, r => r\.riegelErr - r\.strideErr\)/.test(ledgerSrc),
  "computeProofLedger clusters its paired differences by athlete before testing");

// ══ NO OVERSTATED GUARANTEE ══
const stackComment = html.slice(html.indexOf('// ── ADAPTIVE PER-ATHLETE STACKING'),
  html.indexOf('const ADAPTIVE_STACKING_ENABLED'));
ok(/TESTED HEURISTIC, not a theorem/.test(stackComment),
  "adaptive stacking is documented as a heuristic, not a guarantee");
ok(!/is the guarantee/.test(stackComment),
  "the Bates & Granger 'guarantee' claim is gone");

// The ledger competes against the CV family, and labels it honestly.
const cvModel = models.find(m => m.key === 'cvErr');
const tinModel = models.find(m => m.key === 'tinmanErr');
ok(cvModel && /Hill|Jones/.test(cvModel.label), "2-param CV cites the published critical-speed model");
ok(tinModel && /after Schwartz/.test(tinModel.label),
  "the Tinman branch is labeled 'after Schwartz', not as his proprietary calculator");
ok(/cvErr:err\(cv\)/.test(ledgerSrc) && /tinmanErr:err\(tinman\)/.test(ledgerSrc),
  "computeProofLedger actually scores the CV family");
ok(/collectAllPRs\(temp\)/.test(ledgerSrc),
  "the ledger fits CV on the athlete-minus-held-out-PR, keeping the test honest");


// ══ IMPORT-SCREEN CLAIMS MUST MATCH THE ORACLE (Codex review, 2026-07-31) ══
// The import panel quotes accuracy numbers at coaches. Those numbers were once
// wrong in two ways at the same time: they compared "1 other PR" against
// "3 other PRs" while calling it 1-vs-3 TOTAL, and the cohorts were different
// athletes (folds with 3 spare PRs come only from athletes who race many
// distances), so "more data helps" was partly just "these athletes are easier".
// The matched re-analysis in moat_backtest.js §6d killed the 3-PR claim
// entirely. These probes stop the copy drifting back.
const importPanel = html.slice(html.indexOf('What to include — and what each column buys you'),
  html.indexOf('From Google Sheets:'));
ok(importPanel.length > 500, "import guidance panel found");

ok(/4\.7% to 2\.7%/.test(importPanel),
  "import copy quotes the matched second-PR figure from moat_backtest.js §6d");
ok(/n = 61 matched tests across 10 athletes/.test(importPanel),
  "the second-PR claim carries its cohort n and athlete count");
ok(!/87%/.test(importPanel),
  "the discredited 87%-at-3-PRs figure (cohort-selection artifact) is gone");
ok(/Beyond two PRs, we can(&rsquo;|[’'])t yet promise/.test(importPanel),
  "copy states plainly that 3+ PRs is unsupported by the corpus");
ok(!/worst[- ]case/i.test(importPanel),
  "p90 is never described as 'worst case' — it excludes the worst 10%");
ok(/90th-percentile/.test(importPanel),
  "p90 is named accurately");

// Column semantics must match the code, which was checked line by line.
ok(/longer than 10K/.test(importPanel),
  "mileage guidance says LONGER than 10K (_formulaVickersVertosick gates on longest > 10000)");
ok(!/10K-and-longer/.test(importPanel), "the inclusive '10K and longer' wording is gone");
ok(/Grade<\/td><td[^>]*>Display and roster filtering only/.test(importPanel),
  "Grade is disclosed as display-only");
ok(/Years Training<\/td>/.test(importPanel),
  "Years Training is listed as a real column now that it is importable");
ok(/we(&rsquo;|[’'])ll ask you right after import/.test(importPanel),
  "copy tells the coach STRIDE will prompt for training age when the sheet lacks it");
ok(/elite-skewed/.test(importPanel),
  "the corpus limitation travels with the numbers instead of only living in the evidence doc");
ok(/moat_backtest\.js/.test(importPanel),
  "copy names the oracle that reproduces its figures");

// And the import field list genuinely has no training-age column to map.
// ══ TRAINING AGE IS IMPORTABLE, AND PROMPTED FOR WHEN ABSENT ══
// Root fix for the Codex finding: import used to hardcode trainingAge: 0, so a
// bulk-imported varsity squad silently sat on beginner guardrails and paces.
const fieldsSrc = html.slice(html.indexOf('const IMPORT_FIELDS = ['),
  html.indexOf('// Optional per-event PR columns'));
ok(/key: 'trainingAge'/.test(fieldsSrc), "IMPORT_FIELDS now has a training-age column");
ok(!/hints: \[[^\]]*'experience'[^\]]*\][^}]*trainingAge/.test(fieldsSrc),
  "training-age hints avoid the bare terms that collide with Grade");
ok(!/^\s*trainingAge: 0,$/m.test(html),
  "the hardcoded trainingAge: 0 on import is gone");
ok(/take\('trainingAge', m\.trainingAge,/.test(html),
  "imported athletes take training age from the mapped column");
// …and when the sheet has no such column but DOES span multiple competition
// years, training age is derived from that span rather than defaulting to 0
// (the "Elizabeth Leachman is a beginner" report, 2026-07-31).
ok(/const trainingAge = statedTrainingAge > 0 \? statedTrainingAge : derivedSpan;/.test(html),
  "a mapped training-age column always wins over the derived value");
ok(/trainingAgeDerived: statedTrainingAge <= 0 && derivedSpan > 0/.test(html),
  "derived training ages are flagged so the import screen can disclose them");
ok(/Years training derived from season history/.test(html),
  "the import-done screen discloses which athletes got a derived training age");
// …and when it is missing, the import routes to a gap-fill step rather than done.
ok(/stage: needsTrainingAge\.length \? 'enrich' : 'done'/.test(html),
  "a roster with no training-age data routes to the enrich step, not straight to done");
ok(/case 'enrich':\s*return renderImportEnrich\(\);/.test(html),
  "the enrich stage is wired into renderImport");
const enrichSrc = html.slice(html.indexOf('function renderImportEnrich('),
  html.indexOf('function renderImportDone('));
ok(/Skip for now/.test(enrichSrc), "the training-age prompt is skippable, never blocking");
ok(/setAllEnrichTrainingAge/.test(enrichSrc), "a bulk 'set all' control exists for the common case");
ok(/does <strong[^>]*>not<\/strong> affect race forecasts/.test(enrichSrc),
  "the prompt is honest that training age does not change forecasts");

// ══ ROSTER TEMPLATE ══ generated from the importer's own field lists, so the
// template can never offer a column the importer would not accept.
const tplSrc = html.slice(html.indexOf('function rosterTemplateColumns('),
  html.indexOf('function downloadRosterTemplate('));
ok(/EVENT_PR_FIELDS\.map/.test(tplSrc),
  "template event columns are generated from EVENT_PR_FIELDS, not hand-listed");
const dlSrc = html.slice(html.indexOf('function downloadRosterTemplate('),
  html.indexOf('// ── POST-IMPORT GAP FILL'));
ok(/typeof XLSX !== 'undefined'/.test(dlSrc), "template prefers xlsx when SheetJS loaded");
ok(/text\/csv;charset=utf-8/.test(dlSrc), "template falls back to CSV so it never depends on the CDN");
ok(/4\.7% to 2\.7%/.test(html.slice(html.indexOf('function rosterTemplateGuidance('),
  html.indexOf('function downloadRosterTemplate('))),
  "the template's guidance sheet quotes the same evidenced figure as the import panel");


// ══ TEMPLATE ROUND-TRIP ══ The template is only useful if a coach can fill it
// in and drag it straight back with zero manual column mapping. Generating the
// headers from IMPORT_FIELDS is not sufficient on its own — the importer
// auto-detects by HINT matching, so a nice-looking header ("Years Training")
// still has to be something autoDetectColumns actually recognises.
const tplFns = new Function(
  extractConst('IMPORT_FIELDS', '[', ']') + extractConst('EVENT_PR_FIELDS', '[', ']') +
  extractFn('rosterTemplateColumns') + extractFn('rosterTemplateGuidance') +
  extractFn('autoDetectColumns') +
  '; return {rosterTemplateColumns,rosterTemplateGuidance,autoDetectColumns,IMPORT_FIELDS,EVENT_PR_FIELDS};')();
const tplHeaders = tplFns.rosterTemplateColumns().map(c => c.header);
const tplMap = tplFns.autoDetectColumns(tplHeaders);
const tplMapped = Object.values(tplMap).filter(Boolean);
ok(tplHeaders.length >= 20, `template offers the full column set (${tplHeaders.length})`);
const tplUnmapped = tplHeaders.filter(h => !tplMapped.includes(h));
ok(tplUnmapped.length === 0,
  `every template column auto-detects on re-import (unmapped: ${tplUnmapped.join(', ') || 'none'})`);
for(const key of ['name', 'trainingAge', 'raceTime', 'primaryEvent', 'raceDate', 'mileage', 'age', 'sex', 'grade'])
  ok(!!tplMap[key], `template's ${key} column is auto-detected`);
const tplEvents = tplFns.EVENT_PR_FIELDS.filter(ef => tplMap[ef.key]).length;
ok(tplEvents === tplFns.EVENT_PR_FIELDS.length,
  `all ${tplFns.EVENT_PR_FIELDS.length} per-event PR columns auto-detect (${tplEvents} did)`);
// Example rows must be realistic enough to be useful, and clearly replaceable.
const tplCols = tplFns.rosterTemplateColumns();
ok(tplCols[0].example.filter(Boolean).length === 3, "template ships 3 example athletes");
ok(tplCols.every(c => typeof c.note === 'string' && c.note.length > 10),
  "every template column carries an explanation for the 'How to use' sheet");

console.log(`engine probes ok — ${passed} assertions`);
