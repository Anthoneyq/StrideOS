// XC Command executable contracts.
//
// These probes keep the first XC release honest:
// - course adjustment is explicit, uniform, and reversible;
// - non-5K race distances work;
// - pack gaps / top-five spread are deterministic;
// - group prescriptions contain planned fields only;
// - retrying the identical assignment produces the identical source_ref.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractBlock(source, startIdx, openChar, closeChar){
  let depth = 0;
  for(let i = startIdx; i < source.length; i++){
    if(source[i] === openChar) depth++;
    else if(source[i] === closeChar){
      depth--;
      if(depth === 0) return source.slice(startIdx, i + 1);
    }
  }
  throw new Error(`unbalanced ${openChar}${closeChar} block`);
}

function extractFn(name){
  const asyncSig = `async function ${name}(`;
  const sig = html.indexOf(asyncSig) >= 0 ? asyncSig : `function ${name}(`;
  const at = html.indexOf(sig);
  assert.ok(at >= 0, `missing function ${name}`);
  const bodyStart = html.indexOf('{', at);
  return html.slice(at, bodyStart) + extractBlock(html, bodyStart, '{', '}');
}

function extractConst(name, open = '[', close = ']'){
  const sig = `const ${name} = ${open}`;
  const at = html.indexOf(sig);
  assert.ok(at >= 0, `missing const ${name}`);
  const start = at + sig.length - 1;
  return `const ${name} = ${extractBlock(html, start, open, close)};`;
}

const planningSource = [
  extractConst('XC_DISTANCES'),
  extractFn('defaultXcPlan'),
  extractFn('normalizeXcPlan'),
  extractFn('xcCheckpointDistances'),
  extractFn('xcCheckpointLabel'),
  extractFn('xcElapsedAt'),
  `const collectAllPRs = athlete => athlete.distanceCapable === false ? [] : [{ distM: athlete.anchorDistanceM || 5000 }];`,
  `const nearestAnchorForTarget = athlete => ({ event: athlete.anchorEvent || '5K', distM: athlete.anchorDistanceM || 5000 });`,
  `const labelForDistance = distanceM => ({3218:'2 Mile',5000:'5K',6000:'6K',8000:'8K'}[distanceM] || distanceM + 'm');`,
  `const confidenceLabel = confidence => confidence >= 75 ? 'High' : 'Low';`,
  `const raceForecastForTarget = (athlete, target) => {
    if(athlete.noForecast) return null;
    const base = Number(athlete.baseSec);
    return {
      likely: base,
      aggressive: base - 10,
      conservative: base + 20,
      confidence: athlete.observed ? 100 : 80,
      confLabel: athlete.observed ? 'Observed PR' : 'High',
      isObserved: Boolean(athlete.observed),
      anchor: { event: athlete.anchorEvent || '5K' },
      target
    };
  };`,
  extractFn('xcPlanningRows'),
  `return { defaultXcPlan, normalizeXcPlan, xcCheckpointDistances, xcCheckpointLabel, xcElapsedAt, xcPlanningRows };`
].join('\n');
const P = new Function(planningSource)();

assert.deepEqual(P.defaultXcPlan(), {
  meetName:'', meetDate:'', courseName:'', distanceM:5000,
  courseAdjustmentSec:0, notes:'', athleteId:'', segmentText:'',
  carbsPerHour:0, fluidOzPerHour:0, sodiumMgPerHour:0, updatedAt:null
});
assert.equal(P.normalizeXcPlan({ distanceM:1234 }).distanceM, 5000, 'unsupported distance falls back to 5K');
assert.equal(P.normalizeXcPlan({ courseAdjustmentSec:9999 }).courseAdjustmentSec, 7200, 'slow adjustment clamps');
assert.equal(P.normalizeXcPlan({ courseAdjustmentSec:-9999 }).courseAdjustmentSec, -1800, 'fast adjustment clamps');
assert.equal(P.normalizeXcPlan({ meetDate:'08/04/2026' }).meetDate, '', 'non-ISO date is rejected');

assert.deepEqual(P.xcCheckpointDistances(3218).map(Math.round), [1000,1609,3000,3218]);
assert.deepEqual(P.xcCheckpointDistances(5000).map(Math.round), [1000,1609,3000,5000]);
assert.equal(P.xcCheckpointLabel(1609.344,5000), '1 Mile');
assert.equal(P.xcCheckpointLabel(5000,5000), 'Finish');
assert.equal(P.xcElapsedAt(1200,5000,1000), 240);

const athletes = [
  { id:'a', name:'A', raceDistanceM:5000, raceTime:'16:00', baseSec:960, observed:true },
  { id:'b', name:'B', raceDistanceM:3200, raceTime:'10:30', baseSec:990, anchorEvent:'3200m' },
  { id:'c', name:'C', raceDistanceM:1600, raceTime:'5:10', baseSec:1020, anchorEvent:'1600m' },
  { id:'d', name:'D', raceDistanceM:5000, raceTime:'18:00', baseSec:1080 },
  { id:'e', name:'E', raceDistanceM:5000, raceTime:'19:00', baseSec:1140 },
  { id:'f', name:'F', raceDistanceM:800, raceTime:'2:10', baseSec:800, distanceCapable:false },
  { id:'g', name:'G', raceDistanceM:5000, raceTime:'20:00', baseSec:1200, noForecast:true }
];
const slowCourse = P.xcPlanningRows(athletes, {
  meetName:'Invite', distanceM:5000, courseAdjustmentSec:30
});
assert.equal(slowCourse.rows.length, 5);
assert.equal(slowCourse.excluded.length, 2);
assert.equal(slowCourse.rows[0].likely, 990, 'positive course adjustment makes plan slower');
assert.equal(slowCourse.rows[0].aggressive, 980);
assert.equal(slowCourse.rows[0].conservative, 1010);
assert.equal(slowCourse.rows[1].packGapSec, 30);
assert.equal(slowCourse.topFiveSpreadSec, 180);
assert.match(slowCourse.rows[0].evidence, /Observed PR/);

const fastCourse = P.xcPlanningRows(athletes.slice(0,2), {
  meetName:'Fast course', distanceM:6000, courseAdjustmentSec:-15
});
assert.equal(fastCourse.plan.distanceM, 6000, 'non-5K XC distance is preserved');
assert.equal(fastCourse.rows[0].likely, 945, 'negative adjustment makes plan faster');
assert.equal(fastCourse.rows[0].checkpoints.at(-1).distanceM, 6000);

const groupSource = [
  extractConst('GROUP_WORKOUT_ZONES'),
  extractFn('groupWorkoutSourceRef'),
  `const _distanceAthleteView = athlete => athlete;`,
  `const computeZoneSplits = (athlete, opts) => ({
    zones: [{
      label:'Threshold', allowed:athlete.targetMissing !== true, pct:93,
      reps:{ [opts.repDists[0]]: athlete.repSec || 210 }
    }]
  });`,
  `const fmtRepTime = sec => sec >= 60 ? Math.floor(sec/60) + ':' + String(Math.round(sec%60)).padStart(2,'0') : sec.toFixed(1) + 's';`,
  extractFn('buildGroupWorkoutRows'),
  `return { groupWorkoutSourceRef, buildGroupWorkoutRows };`
].join('\n');
const G = new Function(groupSource)();
const coachId = '00000000-0000-4000-8000-000000000099';
const group = {
  id:'grp_A',
  label:'Group A',
  members:[
    { athlete:{ id:'a', name:'A', supabaseId:'00000000-0000-4000-8000-000000000001', repSec:205 } },
    { athlete:{ id:'b', name:'B', supabaseId:'00000000-0000-4000-8000-000000000002', repSec:215 } }
  ]
};
const spec = {
  date:'2026-08-06',
  zoneLabel:'Threshold',
  workoutType:'threshold',
  repDistanceM:1000,
  reps:5,
  recovery:'90 sec jog',
  notes:'Finish together.'
};
const built = G.buildGroupWorkoutRows(group, spec, coachId);
assert.equal(built.error, '');
assert.equal(built.missing.length, 0);
assert.equal(built.rows.length, 2);
assert.equal(built.rows[0].prescribed_distance_m, 5000);
assert.equal(built.rows[0].prescribed_pace_sec_per_km, 205);
assert.equal(built.rows[0].total_distance_m, null, 'completion distance is not fabricated');
assert.equal(built.rows[0].total_duration_sec, null, 'completion duration is not fabricated');
assert.equal(built.rows[0].avg_pace_sec_per_km, null, 'completed pace is not fabricated');
assert.match(built.rows[0].prescribed_notes, /5 × 1000m @ Threshold/);
assert.match(built.rows[0].prescribed_notes, /Recovery: 90 sec jog/);
assert.equal(built.rows[0].source_ref, built.rows[1].source_ref, 'same session shares deterministic ref across athletes');
assert.equal(
  G.buildGroupWorkoutRows(group, spec, coachId).rows[0].source_ref,
  built.rows[0].source_ref,
  'retrying the identical assignment is idempotent'
);
assert.equal(
  G.buildGroupWorkoutRows({ ...group, id:'grp_B', label:'Group B' }, spec, coachId).rows[0].source_ref,
  built.rows[0].source_ref,
  'group movement does not duplicate the same athlete session'
);

const missing = G.buildGroupWorkoutRows({
  id:'grp_A', label:'Group A',
  members:[...group.members, { athlete:{ id:'c', name:'C' } }]
}, spec, coachId);
assert.equal(missing.rows.length, 2);
assert.equal(missing.missing.length, 1);
assert.match(missing.missing[0].reason, /not saved/);
const uuidLocalOnly = G.buildGroupWorkoutRows({
  id:'grp_A', label:'Group A',
  members:[{ athlete:{ id:'11111111-1111-4111-8111-111111111111', name:'UUID local ref only' } }]
}, spec, coachId);
assert.equal(uuidLocalOnly.rows.length, 0, 'UUID-shaped local ref is not treated as a verified cloud row');
assert.equal(uuidLocalOnly.missing.length, 1);
assert.ok(G.buildGroupWorkoutRows(group, { ...spec, reps:0 }, coachId).error, 'invalid session is rejected');

const lookupCalls = [];
const lookupClient = {
  from(table){
    lookupCalls.push(['from',table]);
    const chain = {
      select(value){ lookupCalls.push(['select',value]); return chain; },
      eq(key,value){ lookupCalls.push(['eq',key,value]); return chain; },
      is(key,value){ lookupCalls.push(['is',key,value]); return chain; },
      async maybeSingle(){ return { data:{ id:'cloud-row-7' }, error:null }; }
    };
    return chain;
  }
};
const resolveCloud = new Function('sbClient','sbUser',
  `${extractFn('resolveGroupAthleteCloudId')}; return resolveGroupAthleteCloudId;`
)(lookupClient, { id:coachId });
const uuidLocalAthlete = { id:'11111111-1111-4111-8111-111111111111' };
assert.equal(await resolveCloud(uuidLocalAthlete), 'cloud-row-7',
  'UUID-shaped client ref resolves through the account-scoped athletes table');
assert.equal(uuidLocalAthlete.supabaseId, 'cloud-row-7');
assert.ok(lookupCalls.some(c => c[0] === 'eq' && c[1] === 'coach_id' && c[2] === coachId));
assert.ok(lookupCalls.some(c => c[0] === 'eq' && c[1] === 'client_ref' && c[2] === uuidLocalAthlete.id));

console.log('xc command probes ok — 41 assertions');
