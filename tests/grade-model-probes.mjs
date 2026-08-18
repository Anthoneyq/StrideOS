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
  extractFn('re3MetabolicPower'),
  extractFn('re3LevelSpeedForPower'),
  extractFn('roadGradeEquivalentFlatPace'),
  extractFn('roadGradeTargetPace'),
  extractFn('parseRaceSegmentLines'),
  extractFn('roadGradeCourseEstimate'),
  `return { re3MetabolicPower, re3LevelSpeedForPower, roadGradeEquivalentFlatPace,
    roadGradeTargetPace, parseRaceSegmentLines, roadGradeCourseEstimate };`
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

console.log(`grade model probes ok — ${n} probes`);
