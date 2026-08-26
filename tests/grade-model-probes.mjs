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
  extractScalarConst('DELANEY_LOSS_PER_DEGREE'),
  extractScalarConst('DELANEY_TESTED_MIN_PCT'),
  extractScalarConst('DELANEY_TESTED_MAX_PCT'),
  extractFn('sprintRetentionAtGrade'),
  extractFn('sprintCeilingSpeedMps'),
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
  extractScalarConst('BELT_CALIBRATION_MIN_PCT'),
  extractScalarConst('BELT_CALIBRATION_MAX_PCT'),
  extractFn('beltCalibrationFactor'),
  extractFn('beltDialSpeed'),
  extractFn('beltActualSpeed'),
  extractScalarConst('TRACK_LANE_WIDTH_M'),
  extractScalarConst('TRACK_LANE_1_LAP_M'),
  extractScalarConst('TRACK_LANE_2_STAGGER_M'),
  extractScalarConst('TRACK_MAX_LANE'),
  extractFn('trackLapDistanceM'),
  extractFn('gradeFlatEquivalentMeters'),
  extractFn('parseTime'),
  extractFn('parsePaceOrSpeed'),
  extractFn('mphToPaceSecPerMile'),
  extractFn('paceSecPerMileToMph'),
  `return { re3MetabolicPower, re3LevelSpeedForPower, roadGradeEquivalentFlatPace,
    roadGradeTargetPace, parseRaceSegmentLines, roadGradeCourseEstimate,
    re3DragGradePct, re3SurfacePower, re3SurfaceSpeedForPower, gradeTargetSpeedMps,
    gradeFlatEquivalentPace, hillRepGeometry, minettiCostOfTransport,
    minettiTargetSpeedMps, parsePaceOrSpeed, mphToPaceSecPerMile,
    paceSecPerMileToMph, RE3_STEADY_MIN_REP_SEC, RE3_ISOEFFORT_VALIDATION, MPS_TO_MPH,
    sprintRetentionAtGrade, sprintCeilingSpeedMps, DELANEY_TESTED_MAX_PCT,
    beltCalibrationFactor, beltDialSpeed, beltActualSpeed, BELT_CALIBRATION_MIN_PCT,
    BELT_CALIBRATION_MAX_PCT, trackLapDistanceM, TRACK_LANE_1_LAP_M, TRACK_MAX_LANE,
    gradeFlatEquivalentMeters };`
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


// ══════════════════════════════════════════════════════════════════════
// THE SHORT-REP BRACKET — Delaney et al. (2022), J Sports Sci 40(3):281-287
// Cost-matching is only the FLOOR for a short rep. The ceiling is the least
// metabolically constrained case there is: maximal sprint velocity, which
// falls 1.7% per DEGREE of angle. A 40s rep cannot retain more speed than an
// all-out sprint, so the honest answer is bounded on both sides by published
// measurement and by nothing in between.
// ══════════════════════════════════════════════════════════════════════
close(E.sprintRetentionAtGrade(0), 1, 1e-9, 'zero grade retains all of flat max velocity');
// The coefficient is per DEGREE. Applying it to grade-percent instead would
// give 1 - 0.017*7 = 88.1% at +7% instead of 93.2% — a 5-point error that
// would silently narrow the bracket.
close(E.sprintRetentionAtGrade(7), 0.9319, 0.001, '+7% grade = 4.00 deg -> 93.2% max-velocity retention');
close(E.sprintRetentionAtGrade(17.6), 0.8303, 0.002, 'top of the tested range (17.6% = 9.98 deg) -> 83.0%');
ok(Math.abs(E.sprintRetentionAtGrade(7) - (1 - 0.017 * 7)) > 0.04,
  'the per-degree conversion is actually applied — a per-percent reading differs by >4 points');
ok(E.sprintRetentionAtGrade(20) === null, 'beyond the tested range the ceiling is refused, not extrapolated');
ok(E.sprintRetentionAtGrade(-5) === null, 'the sprint relation is uphill-only');

// The bracket must be a real bracket: ceiling strictly above floor, and both
// below flat speed. If these ever cross, the tool is telling a coach a short
// rep should be run faster than the flat anchor it came from.
const anchorPace = 1609.344 / (11.25 / E.MPS_TO_MPH);   // 10:00 3K = 11.25 mph flat
const floorV = E.gradeTargetSpeedMps(anchorPace, 7, 'belt');
const ceilV = E.sprintCeilingSpeedMps(anchorPace, 7);
ok(ceilV > floorV, 'ceiling sits above the cost-matched floor');
ok(ceilV < 1609.344 / anchorPace, 'ceiling stays below flat speed — a hill never gives speed back');
close(floorV * E.MPS_TO_MPH, 8.56, 0.1, 'floor for a 10:00 3K runner at +7% on a belt is 8.6 mph');
close(ceilV * E.MPS_TO_MPH, 10.48, 0.1, 'ceiling for the same athlete is 10.5 mph');

// Alex Muntefering's own RPE-matched observation (9.6-10.0 mph at 7% against
// an 11.25 mph flat anchor) must land INSIDE the bracket. That is the whole
// claim: his instinct was not a calculator error and not a duration curve —
// it was a short rep sitting between two regimes.
[9.6, 10.0].forEach(mph => {
  const v = mph / E.MPS_TO_MPH;
  ok(v > floorV && v < ceilV, `Alex's observed ${mph} mph falls inside the published bracket`);
});
ok((9.6 / E.MPS_TO_MPH) > (floorV + ceilV) / 2, "and nearer the sprint edge, as a 40s rep should be");

// Belt calibration cannot be the explanation. Willwacher (2021) bounds belt
// error at 98-103% of display; the gap between floor and what Alex settles on
// is 12-17%. Recording this stops the hypothesis being re-litigated.
const gapPct = (9.6 / (floorV * E.MPS_TO_MPH) - 1) * 100;
ok(gapPct > 3 * 3, 'the observed gap is several times larger than the ±3% a miscalibrated belt can produce');

ok(html.includes('Delaney, J. A. et al.') && html.includes('Shahidi, S. H.') && html.includes('Willwacher, S. et al.'),
  'the bracket, the drag-band caveat and the belt-error bound are all cited');
ok(html.includes('the answer is a range, and these are its edges'), 'the short-rep block presents a range, not a single number');


// ══════════════════════════════════════════════════════════════════════
// WIND, BELT CALIBRATION, TRACK GEOMETRY & ENERGY-EQUIVALENT DISTANCE
// (2026-08-26) — harvested from the Surface Lab research build, archived
// at research/surface-lab-2026-08-25/. Everything here either reuses an
// already-calibrated term or is pure geometry; the research's own verdict
// was that no NEW fitted coefficient set is defensible yet, and nothing
// below adds one.
// ══════════════════════════════════════════════════════════════════════

// ── Wind rides the existing drag term, so it cannot double-count ──
// There is exactly one aerodynamic model in the app. Wind swaps ground speed
// for relative air speed inside it; it does not add a second correction on
// top (the failure mode the research paper flags by name).
close(E.re3DragGradePct(5.0, 0), E.re3DragGradePct(5.0), 1e-12, 'wind: omitting the argument is still calm air');
close(E.re3DragGradePct(4.0, 0), 0.64, 1e-9, 'wind: calm 4.0 m/s is unchanged at (4/5)^2 = 0.64%');
close(E.re3DragGradePct(4.0, 1.0), 1.0, 1e-9, 'wind: 4 m/s into a 1 m/s headwind meets 5 m/s of air — the 1% calibration point');
ok(E.re3DragGradePct(4, 2) > E.re3DragGradePct(4, 0), 'wind: a headwind costs more than calm air');
ok(E.re3DragGradePct(4, -2) < E.re3DragGradePct(4, 0), 'wind: a tailwind costs less than calm air');
// Sign is kept rather than squared away: a tailwind faster than the runner is
// a push, and the equivalent grade must be able to go negative to say so.
ok(E.re3DragGradePct(3, -5) < 0, 'wind: a tailwind faster than the runner reads as assistance, not cost');
close(E.re3DragGradePct(6, 5), 1.96, 1e-9, 'wind: relative air speed clamps at Pugh’s 7 m/s edge, not the ground speed');

// The belt has no air to push through, so wind must not touch it.
close(E.re3SurfacePower(4, 5, 'belt', 6), E.re3SurfacePower(4, 5, 'belt', 0), 1e-12, 'wind: a treadmill is unaffected by headwind');
ok(E.re3SurfacePower(4, 5, 'outdoor', 6) > E.re3SurfacePower(4, 5, 'outdoor', 0), 'wind: the road is not');

// The anchor is a flat-ability statement, not a weather report. Charging wind
// to both sides would cancel and silently print no effect at all.
close(E.gradeTargetSpeedMps(480, 0, 'outdoor', 0), 1609.344 / 480, 1e-6, 'wind: calm air at zero grade is the identity');
ok(E.gradeTargetSpeedMps(480, 0, 'outdoor', 3) < E.gradeTargetSpeedMps(480, 0, 'outdoor', 0), 'wind: a headwind slows the same-effort target on flat ground');
ok(E.gradeTargetSpeedMps(480, 5, 'outdoor', 3) < E.gradeTargetSpeedMps(480, 5, 'outdoor', 0), 'wind: and on a hill');
// A rep run into a headwind was worth MORE than the same clock time in calm air.
ok(E.gradeFlatEquivalentPace(3.5, 0, 'outdoor', 4) < E.gradeFlatEquivalentPace(3.5, 0, 'outdoor', 0), 'wind: holding pace into a headwind converts to a faster calm-air effort');

// ── Belt calibration (Willwacher 2021: 98-103% of display) ──
close(E.beltCalibrationFactor(100), 1, 1e-12, 'belt: 100% is the identity');
close(E.beltCalibrationFactor(undefined), 1, 1e-12, 'belt: an unmeasured machine changes nothing');
close(E.beltCalibrationFactor(140), 1, 1e-12, 'belt: an implausible calibration is refused, not applied');
close(E.beltCalibrationFactor(E.BELT_CALIBRATION_MIN_PCT - 0.1), 1, 1e-12, 'belt: below the accepted band falls back to identity');
// A belt that runs 3% fast must be dialed 3% LOW to run the prescribed speed.
close(E.beltDialSpeed(4.0, 103), 4.0 / 1.03, 1e-9, 'belt: a fast belt is dialed down to hit the true target');
close(E.beltActualSpeed(4.0, 103), 4.0 * 1.03, 1e-9, 'belt: a fast belt actually runs above what was dialed');
close(E.beltActualSpeed(E.beltDialSpeed(4.2, 97.5), 97.5), 4.2, 1e-9, 'belt: dial and actual are exact inverses');
close(E.beltDialSpeed(4.0, 100), 4.0, 1e-12, 'belt: an uncalibrated machine prints the model answer unchanged');
// Willwacher's measured band is ±2-3%, which is real but small — it must not
// be reachable as an explanation for the 12-17% short-rep gap Alex reported.
ok(Math.abs(E.beltDialSpeed(4, 103) - 4) / 4 < 0.05, 'belt: the worst calibration in the literature moves the answer by <5%');

// ── Track lane geometry (World Athletics) ──
close(E.trackLapDistanceM(1), 400, 1e-9, 'track: lane 1 is 400m by definition');
close(E.trackLapDistanceM(2), 407.038, 1e-9, 'track: the first stagger is the odd one (0.30m vs 0.20m measurement offset)');
// Tolerance is 2mm because the archived table rounds each lane's 7.66549m to
// 7.666 before summing; these values are the unrounded geometry.
close(E.trackLapDistanceM(5), 430.034, 2e-3, 'track: lane 5 laps are 430m');
close(E.trackLapDistanceM(8), 453.032, 2e-3, 'track: lane 8 laps are 453m — 13% longer than the written rep');
ok(E.trackLapDistanceM(9) === null && E.trackLapDistanceM(0) === null, 'track: lanes outside 1-8 are refused');
for(let lane = 2; lane <= E.TRACK_MAX_LANE; lane++){
  ok(E.trackLapDistanceM(lane) > E.trackLapDistanceM(lane - 1), `track: lane ${lane} is longer than lane ${lane - 1}`);
}
// Every lane above 1 adds exactly one lane width of circumference.
close(E.trackLapDistanceM(8) - E.trackLapDistanceM(7), 2 * Math.PI * 1.22, 1e-9, 'track: outer staggers are exactly 2*pi*lane width');

// ── Energy-equivalent distance ──
// Equal metabolic power for equal duration is equal energy, so the flat
// distance covered in the same time IS the energy-equivalent distance. No
// second model, no cost-of-transport table.
close(E.gradeFlatEquivalentMeters(3.5, 0, 'outdoor', 1000, 0), 1000, 1e-3, 'flat-equivalent: level ground is the identity');
ok(E.gradeFlatEquivalentMeters(3.0, 5, 'outdoor', 1000, 0) > 1000, 'flat-equivalent: 1000m uphill is worth more than 1000m flat');
ok(E.gradeFlatEquivalentMeters(3.0, -5, 'outdoor', 1000, 0) < 1000, 'flat-equivalent: and a descent is worth less');
ok(E.gradeFlatEquivalentMeters(3.0, 0, 'outdoor', 1000, 4) > 1000, 'flat-equivalent: a headwind adds equivalent distance too');
ok(E.gradeFlatEquivalentMeters(0, 5, 'outdoor', 1000, 0) === null, 'flat-equivalent: a zero speed has no answer');
ok(E.gradeFlatEquivalentMeters(3.0, 5, 'outdoor', 0, 0) === null, 'flat-equivalent: a zero distance has no answer');
// Directionally this must land near the published Minetti ratio for +5%
// (1.30x per the archived equivalency table) without being fitted to it.
{
  const ratio = E.gradeFlatEquivalentMeters(3.0, 5, 'outdoor', 1000, 0) / 1000;
  ok(ratio > 1.15 && ratio < 1.45, `flat-equivalent: +5% lands near the published ~1.3x (got ${ratio.toFixed(3)})`);
}

// ── Regression pin against the independently computed equivalency table ──
// research/surface-lab-2026-08-25/grade_equivalency_table.csv was produced by
// a separate implementation from the RE3 paper's ROUNDED coefficients
// (30.43 / 1.133 / 1.056 / 43); the app carries the unrounded ones. The two
// must therefore agree in shape and to within that rounding, and be exactly
// equal at zero grade. Any larger drift means someone changed the model.
{
  const csv = fs.readFileSync(path.join(root, 'research/surface-lab-2026-08-25/grade_equivalency_table.csv'), 'utf8')
    .trim().split('\n');
  const head = csv[0].split(',');
  const gi = head.indexOf('grade_percent'), ri = head.indexOf('re3_rate_w_kg_at_3mps');
  ok(gi >= 0 && ri >= 0, 'equivalency table: archived CSV still has the columns this pin reads');
  let checked = 0;
  for(const line of csv.slice(1)){
    const cells = line.split(',');
    const g = Number(cells[gi]), want = Number(cells[ri]);
    if(!isFinite(g) || !isFinite(want) || g < E.RE3_MIN_GRADE_PCT || g > E.RE3_MAX_GRADE_PCT) continue;
    close(E.re3MetabolicPower(3.0, g / 100), want, 0.2,
      `equivalency table: RE3 at 3 m/s and ${g}% matches the archived table within coefficient rounding`);
    checked++;
  }
  ok(checked >= 10, `equivalency table: the pin actually covered the shipped grade band (${checked} rows)`);
  close(E.re3MetabolicPower(3.0, 0), 12.29, 1e-9, 'equivalency table: level rate at 3 m/s is exact — rounding cannot hide here');
}


console.log(`grade model probes ok — ${n} probes`);
