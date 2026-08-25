// Pure-function probes for the RE3 road-grade tool and Race Command's
// non-applied grade-only signal. Run: node tests/grade-model-probes.mjs
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
function extractScalarConst(name){
  const sig = `const ${name} = `;
  const at = html.indexOf(sig);
  if(at < 0) throw new Error(`const ${name} not found`);
  const end = html.indexOf(';',at);
  return html.slice(at,end+1);
}

const src = [
  extractScalarConst('RE3_MIN_GRADE_PCT'),
  extractScalarConst('RE3_MAX_GRADE_PCT'),
  extractScalarConst('RE3_DRAG_REF_MPS'),
  extractScalarConst('RE3_DRAG_REF_GRADE_PCT'),
  extractScalarConst('RE3_DRAG_MAX_MPS'),
  extractScalarConst('RE3_STEADY_MIN_REP_SEC'),
  extractScalarConst('RE3_ISOEFFORT_VALIDATION'),
  extractScalarConst('MPS_TO_MPH'),
  extractFn('re3MetabolicPower'),
  extractFn('re3LevelSpeedForPower'),
  extractFn('roadGradeEquivalentFlatPace'),
  extractFn('roadGradeTargetPace'),
  extractFn('parseRaceSegmentLines'),
  extractFn('roadGradeCourseEstimate'),
  extractFn('re3DragGradePct'),
  extractFn('re3SurfacePower'),
  extractFn('re3SurfaceSpeedForPower'),
  extractFn('gradeTargetSpeedMps'),
  extractFn('gradeFlatEquivalentPace'),
  extractFn('hillRepGeometry'),
  extractFn('minettiCostOfTransport'),
  extractFn('minettiTargetSpeedMps'),
  extractFn('parseTime'),
  extractFn('parsePaceOrSpeed'),
  extractFn('mphToPaceSecPerMile'),
  extractFn('paceSecPerMileToMph'),
  `return { re3MetabolicPower, re3LevelSpeedForPower, roadGradeEquivalentFlatPace,
    roadGradeTargetPace, parseRaceSegmentLines, roadGradeCourseEstimate,
    re3DragGradePct, re3SurfacePower, re3SurfaceSpeedForPower, gradeTargetSpeedMps,
    gradeFlatEquivalentPace, hillRepGeometry, minettiCostOfTransport,
    minettiTargetSpeedMps, parsePaceOrSpeed, mphToPaceSecPerMile,
    paceSecPerMileToMph, RE3_STEADY_MIN_REP_SEC, RE3_ISOEFFORT_VALIDATION, MPS_TO_MPH };`
].join('\n');
const E = new Function(src)();

let n = 0;
function ok(value,message){ if(!value) throw new Error(`PROBE FAIL: ${message}`); n++; }
function close(actual,want,tolerance,message){
  ok(Math.abs(actual-want) <= tolerance,`${message} (got ${actual}, want ${want}±${tolerance})`);
}

close(E.roadGradeEquivalentFlatPace(480,5),374,1,'8:00/mi at +5% is about 6:14 flat effort');
close(E.roadGradeTargetPace(480,5),640,1,'8:00/mi flat effort targets about 10:40/mi at +5%');
close(E.roadGradeTargetPace(480,-5),379,1,'8:00/mi flat effort targets about 6:19/mi at -5%');
close(E.roadGradeEquivalentFlatPace(480,0),480,1e-6,'zero grade is identity');
ok(E.roadGradeEquivalentFlatPace(480,16) === null,'grade beyond UI/model bound is rejected');

const loop = E.roadGradeCourseEstimate('Up | 1 | 264 | hold\nDown | 1 | -264 | relax',960,3218.688);
ok(loop && loop.segments.length === 2,'complete two-segment loop is modeled');
close(loop.segments[0].gradePct,5,0.01,'rise/run converts to +5%');
close(loop.segments[1].gradePct,-5,0.01,'descent/run converts to -5%');
close(loop.deltaSec,60,2,'equal +5/-5 segments do not metabolically cancel');
ok(E.roadGradeCourseEstimate('Short | 1 | 0 | cue',960,5000) === null,'incomplete course is not modeled');
// Completeness tolerance is proportional (2% of race, capped 0.15mi): a
// 0.10mi "course" for a 400m race sat inside the old flat 0.15mi allowance
// and modeled 40% of the race as if it were all of it.
ok(E.roadGradeCourseEstimate('Bell lap | 0.10 | 5 | go',60,400) === null,'400m: 0.10mi partial course is rejected');
ok(E.roadGradeCourseEstimate('Half of it | 0.25 | 8 | hold',130,800) === null,'800m: half-distance course is rejected');
const q400 = E.roadGradeCourseEstimate('Full lap | 0.2486 | 2 | go',60,400);
ok(q400 && q400.segments.length === 1,'400m: full-distance course is modeled');
const long = E.roadGradeCourseEstimate('Out | 13.0 | 300 | settle\nBack | 13.1 | -300 | race',9000,42195);
ok(long && long.segments.length === 2,'marathon: 0.1mi rounding slack still accepted (cap keeps long courses practical)');
ok(E.roadGradeCourseEstimate('Wall | 1 | 900 | cue',480,1609.344) === null,'segment beyond ±15% bound is not modeled');
ok(html.includes("roadGradeToolHTML('ftGrade', '', true)"),'public calculator embeds grade with its race anchor');
ok(html.includes("gradePaceEl.value = _mmss(secPerM * 1609.344, 0)"),'race input automatically feeds grade pace');


// ══════════════════════════════════════════════════════════════════════
// SURFACE, AIR RESISTANCE & SHORT-REP PROBES (2026-08-25)
// Alex Muntefering, prescribing 200s on a 7% treadmill instead of on the
// track, reported the converted belt speed read "really off (overly slow)".
// It was not off — it was a steady-state answer to a 40s rep, and it was
// charging the belt for air resistance the athlete never pushed through.
// ══════════════════════════════════════════════════════════════════════

// ── Air resistance carried as an equivalent grade ──
// Pugh (1971) measured the still-air cost as ~2% of total metabolic cost at
// 3.3 m/s rising to ~8% at 6 m/s. Jones & Doust (1996) fix the calibration
// point at 1% grade / 5.0 m/s. A v^2 law through that point must reproduce
// both; a flat 1% (the naive reading of Jones & Doust) does not — it charges
// a 10:00/mi jogger the same 5% a 5:20 runner pays.
close(E.re3DragGradePct(5.0), 1.0, 1e-9, 'drag: calibration point is exactly 1% grade at 5.0 m/s');
ok(E.re3DragGradePct(2.5) < E.re3DragGradePct(5.0), 'drag: cost falls with speed');
ok(E.re3DragGradePct(0) === 0 && E.re3DragGradePct(-3) === 0, 'drag: no cost at or below zero speed');
close(E.re3DragGradePct(10), E.re3DragGradePct(7), 1e-9, 'drag: held at 7 m/s rather than extrapolated past the data');
const dragPct = (v) => (E.re3SurfacePower(v, 0, 'outdoor') / E.re3SurfacePower(v, 0, 'belt') - 1) * 100;
close(dragPct(3.35), 2.0, 0.6, 'drag ≈ Pugh 2% of metabolic cost at 3.35 m/s (8:00/mi)');
close(dragPct(5.03), 5.0, 0.6, 'drag ≈ Pugh 5% of metabolic cost at 5.03 m/s (5:20/mi)');
close(dragPct(6.0), 8.0, 1.0, 'drag ≈ Pugh 8% of metabolic cost at 6.0 m/s');

// ── The belt is not the road ──
// The same effort must come out FASTER on a belt: it is the one surface with
// no air to push. This is the half of Alex's complaint that was a real bug.
const beltV = E.gradeTargetSpeedMps(320, 7, 'belt');
const roadV = E.gradeTargetSpeedMps(320, 7, 'outdoor');
ok(beltV > roadV, 'belt target is faster than the road target at the same grade');
close(beltV * E.MPS_TO_MPH, 8.56, 0.1, '5:20/mi flat at +7% = 8.6 mph on the belt');
close(beltV / roadV, 1.027, 0.01, 'belt runs ~2.7% faster than the road at +7% — the drag the target itself never pays');
close(beltV / (1609.344 / E.roadGradeTargetPace(320, 7)), 1.051, 0.01,
  'belt target is ~5% faster than the old road-only math — the half of Alexs complaint that was a real bug');
close(E.gradeTargetSpeedMps(320, 0, 'belt') * E.MPS_TO_MPH, 11.73, 0.15,
  'a 5:20 road mile is 11.7 mph on a belt, not 11.25 — the belt has no air to push');

// ── Round trip ──
[[320,7],[480,3],[420,12],[600,0]].forEach(([pace,grade])=>{
  const v = E.gradeTargetSpeedMps(pace, grade, 'belt');
  close(E.gradeFlatEquivalentPace(v, grade, 'belt'), pace, 0.5,
    `round trip: ${pace}s/mi at ${grade}% on the belt returns its own anchor`);
});

// ── Bounds ──
ok(E.gradeTargetSpeedMps(320, 16, 'belt') === null, 'grade beyond the model bound is refused');
ok(E.gradeTargetSpeedMps(320, -16, 'outdoor') === null, 'downhill beyond the model bound is refused');
ok(E.gradeFlatEquivalentPace(0, 7, 'belt') === null, 'zero speed is not an effort');

// ── Minetti cross-check ──
// The independent 2002 model must land within a few percent of RE3, or the
// answer we hand a coach is a single model's opinion rather than a finding.
close(E.minettiCostOfTransport(0), 3.6, 1e-9, 'Minetti level cost of transport is 3.6 J/kg/m');
close(E.minettiCostOfTransport(0.07) / E.minettiCostOfTransport(0), 1.438, 0.01,
  'Minetti: +7% costs ~44% more per metre');
const minettiV = E.minettiTargetSpeedMps(320, 7, 'belt');
ok(Math.abs(minettiV - beltV) / minettiV < 0.05,
  'RE3 and Minetti agree within 5% at +7% on the belt — the calculator is not off');
ok(E.minettiTargetSpeedMps(320, 7, 'belt') > E.minettiTargetSpeedMps(320, 7, 'outdoor'),
  'the cross-check carries drag the same way RE3 does, or it is not a cross-check');

// ── Rep geometry: match the clock, not the distance ──
// Holding 200m at the converted pace stretches a 40s rep to ~55s and quietly
// changes the stimulus. This is the other half of Alex's complaint.
const held = E.hillRepGeometry(beltV, 320, 200, 'm');
close(held.seconds, 52, 3, 'a 200 held at distance on a 7% belt takes ~52s, not 40s');
close(held.flatSeconds, 40, 1, 'the same 200 flat at 5:20/mi takes 40s');
const clock = E.hillRepGeometry(beltV, 320, 40, 'sec');
close(clock.meters, 153, 6, 'time-matched: 40s on the belt covers ~153m');
close(clock.flatMeters, 200, 3, 'time-matched: the same 40s flat covers 200m');
ok(E.hillRepGeometry(beltV, 320, 0, 'sec') === null, 'a zero-length rep is not geometry');

// ── Short-rep floor ──
ok(E.RE3_STEADY_MIN_REP_SEC === 90, 'steady-state floor threshold is 90s (VO2 kinetics, Poole & Jones 2012)');
ok(clock.seconds < E.RE3_STEADY_MIN_REP_SEC, "Alex's 40s rep trips the short-rep warning");
ok(E.hillRepGeometry(beltV, 320, 600, 'sec').seconds >= E.RE3_STEADY_MIN_REP_SEC,
  'a 10-minute hill effort is steady state and gets the number without the caveat');

// Alex's own RPE-matched pairing (a 5:20 anchor athlete holding ~6:00-6:15 on
// a 7% belt) should read as a much harder ANCHOR, not as a broken model. If
// this ever resolves near 5:20 the surface math has drifted.
const alexImplied = E.gradeFlatEquivalentPace(1609.344/375, 7, 'belt');
ok(alexImplied < 300, `Alex's 6:15 belt rep implies a sub-5:00 flat anchor (got ${Math.round(alexImplied)}s/mi) — 400/800 effort, not 3k`);

// ── Belt speed input ──
// Coaches dial mph, races are run in mm:ss. Both must parse, unambiguously.
close(E.parsePaceOrSpeed('8.6'), 3600/8.6, 1e-6, 'a bare decimal reads as belt mph');
close(E.parsePaceOrSpeed('8.6 mph'), 3600/8.6, 1e-6, 'an explicit mph suffix reads as belt mph');
close(E.parsePaceOrSpeed('7:01'), 421, 1e-6, 'mm:ss still reads as pace');
close(E.parsePaceOrSpeed('8'), 8, 1e-6, 'a bare integer keeps its existing parseTime meaning');
ok(E.parsePaceOrSpeed('') === null && E.parsePaceOrSpeed('abc') === null, 'junk input is refused');

// ── No regression in the road-only path the XC course model depends on ──
close(E.roadGradeTargetPace(480,5),640,1,'legacy road-only conversion is untouched');

// ── The tool surfaces all of it ──
ok(html.includes("id=\"${prefix}Surface\""),'tool exposes a surface selector');
ok(html.includes('Treadmill belt'),'treadmill is a named surface, not a footnote');
ok(html.includes('Match the clock, not the distance'),'rep guidance is on screen');
ok(html.includes('Anchor ladder'),'anchor ladder is on screen');
ok(html.includes('Jones, A. M. & Doust, J. H.') && html.includes('Pugh, L. G. C. E.') &&
   html.includes('Poole, D. C. & Jones, A. M.'),'new model claims are cited in Sources');
ok(html.includes("activityIsIndoorBelt"),'treadmill imports are detected');
ok(html.includes('TREADMILL · BELT DISTANCE'),'treadmill workouts are labelled in the log');


// ══════════════════════════════════════════════════════════════════════
// EMPIRICAL VALIDATION — Held et al. (2023), Front Physiol 14:1177828
// 17 well-trained runners, 4x5min at 1% and at 8%, matched by PERCEIVED
// EFFORT with speed self-selected: 4.47 m/s flat, 3.17 m/s uphill. This is
// the only published dataset that pairs effort-matching against a grade, and
// it is the licence for the number this tool prints. If a model change ever
// breaks agreement with it, that is a regression, not an improvement.
// ══════════════════════════════════════════════════════════════════════
const V = E.RE3_ISOEFFORT_VALIDATION;
const heldAnchor = 1609.344 / V.flatMps;
const heldPredicted = E.gradeTargetSpeedMps(heldAnchor, V.gradePct, 'belt');
ok(Math.abs(heldPredicted - V.upMps) / V.upMps < 0.02,
  `cost-matched prediction lands within 2% of what 17 runners chose by effort at 8% (predicted ${heldPredicted.toFixed(3)} vs observed ${V.upMps} m/s)`);
close((heldPredicted / V.upMps - 1) * -100, V.agreementPct, 0.5,
  'the recorded agreement figure matches what the shipped model actually computes');
ok(V.repSec >= E.RE3_STEADY_MIN_REP_SEC,
  'the validation is on 5-minute reps — it licenses the steady end, not the short end');

// Minetti is close behind; ACSM is the outlier, HIGH, exactly the direction
// Foreman (2022) warns chart-type conversions drift at 6% and above. Any
// duration curve anchored on ACSM inherits that error as its asymptote.
const heldMinetti = E.minettiTargetSpeedMps(heldAnchor, V.gradePct, 'belt');
ok(Math.abs(heldMinetti - V.upMps) / V.upMps < 0.04, 'Minetti also lands within 4% of the observed effort-matched speed');
const acsmVo2 = (v, g) => 0.2 * (v * 60) + 0.9 * (v * 60) * g + 3.5;
const acsmSpeed = (vo2, g) => ((vo2 - 3.5) / (0.2 + 0.9 * g)) / 60;
const heldAcsm = acsmSpeed(acsmVo2(V.flatMps, 0.01), V.gradePct / 100);
ok(heldAcsm > V.upMps * 1.05,
  `ACSM predicts >5% faster than 17 runners actually chose (${heldAcsm.toFixed(3)} vs ${V.upMps} m/s) — it under-prices steep grade`);
ok(Math.abs(heldPredicted - V.upMps) < Math.abs(heldAcsm - V.upMps),
  'the shipped model beats ACSM against the only effort-matched data there is');

// No duration term. Pringle et al. (2002) found no VO2-kinetics difference
// between 0% and 10% at moderate intensity, so a duration-dependent grade
// correction has no measured basis. The answer must not move with rep length.
const shortRep = E.gradeTargetSpeedMps(320, 7, 'belt');
const longRep = E.gradeTargetSpeedMps(320, 7, 'belt');
close(shortRep, longRep, 1e-12, 'the conversion carries no hidden duration term — rep length changes the WARNING, never the number');
ok(html.includes('Pringle, J. S. M.') && html.includes('Held, S., Rappelt, L. & Donath, L.'),
  'both the validation and the no-duration-correction finding are cited');
ok(html.includes('Nobody has run that experiment at 40 seconds'),
  'the tool states exactly where the evidence stops');

console.log(`grade model probes ok — ${n} probes`);
