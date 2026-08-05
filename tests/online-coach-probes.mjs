// Online Coach OS executable contracts.
//
// These probes enforce the product-state boundaries:
// - athlete check-ins are reported values, never a readiness score;
// - the queue separates reports, notes, unknown completion, and completed work;
// - reusable programs create idempotent prescriptions with blank completion;
// - Garmin/Strava CSV imports create completed activity rows, never prescriptions.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/20260804170000_online_coach_os.sql', import.meta.url),'utf8');
let assertions = 0;
const ok = (value,message) => { assertions++; assert.ok(value,message); };
const eq = (actual,expected,message) => { assertions++; assert.equal(actual,expected,message); };
const deep = (actual,expected,message) => { assertions++; assert.deepEqual(actual,expected,message); };

function extractBlock(source,startIdx,openChar,closeChar){
  let depth=0;
  for(let i=startIdx;i<source.length;i++){
    if(source[i]===openChar) depth++;
    else if(source[i]===closeChar){
      depth--;
      if(depth===0) return source.slice(startIdx,i+1);
    }
  }
  throw new Error(`unbalanced ${openChar}${closeChar}`);
}

function extractFn(name){
  const asyncSig=`async function ${name}(`;
  const sig=html.indexOf(asyncSig)>=0?asyncSig:`function ${name}(`;
  const at=html.indexOf(sig);
  assert.ok(at>=0,`missing function ${name}`);
  const argsStart=html.indexOf('(',at);
  let depth=0;
  let argsEnd=-1;
  for(let i=argsStart;i<html.length;i++){
    if(html[i]==='(') depth++;
    else if(html[i]===')'){
      depth--;
      if(depth===0){ argsEnd=i; break; }
    }
  }
  assert.ok(argsEnd>=0,`missing argument boundary for ${name}`);
  const bodyStart=html.indexOf('{',argsEnd);
  return html.slice(at,bodyStart)+extractBlock(html,bodyStart,'{','}');
}

function extractConst(name,open='[',close=']'){
  const sig=`const ${name} = ${open}`;
  const at=html.indexOf(sig);
  assert.ok(at>=0,`missing const ${name}`);
  const start=at+sig.length-1;
  return `const ${name} = ${extractBlock(html,start,open,close)};`;
}

const queueSource = [
  extractFn('localIsoDate'),
  extractFn('isoDateAdd'),
  extractFn('mondayForIso'),
  extractFn('normalizeCheckIn'),
  `const workoutTypeLabel=value=>value;`,
  `const fmtDistance=value=>value?value+'m':'—';`,
  `const fmtDuration=value=>value?value+'s':'—';`,
  `const labelForDistance=value=>value===42195?'Marathon':value+'m';`,
  extractFn('buildOnlineCoachQueue'),
  `return {localIsoDate,isoDateAdd,mondayForIso,normalizeCheckIn,buildOnlineCoachQueue};`
].join('\n');
const Q = new Function(queueSource)();

eq(Q.mondayForIso('2026-08-06'),'2026-08-03','week starts Monday');
eq(Q.isoDateAdd('2026-08-31',1),'2026-09-01','date addition crosses month');
eq(Q.localIsoDate('not-a-date'),'','invalid dates stay invalid');
const check = Q.normalizeCheckIn({
  id:'ci1',clientRef:'checkin:a:2026-08-03',athleteId:'a',weekOf:'2026-08-06',
  energy:9,soreness:-2,confidence:3,sleepHours:30,athleteNote:' Athlete report '
});
eq(check.weekOf,'2026-08-03','check-in week normalizes to Monday');
eq(check.energy,5,'reported energy clamps to field range');
eq(check.soreness,1,'reported soreness clamps to field range');
eq(check.confidence,3);
eq(check.sleepHours,24);
eq(check.athleteNote,'Athlete report');
ok(!('readiness' in check),'check-in does not synthesize readiness');
ok(!('recommendation' in check),'check-in does not synthesize recommendation');

const queue = Q.buildOnlineCoachQueue({
  athletes:[{id:'a',supabaseId:'cloud-a',name:'Runner A'}],
  checkIns:[
    {id:'ci-open',athleteId:'a',weekOf:'2026-08-03',submittedAt:'2026-08-04T08:00:00Z',energy:2,soreness:4,confidence:3,athleteNote:'Question'},
    {id:'ci-done',athleteId:'a',weekOf:'2026-07-27',submittedAt:'2026-07-29T08:00:00Z',energy:5,soreness:1,confidence:5,coachResponse:'Received'}
  ],
  workouts:[
    {id:'note',athlete_id:'cloud-a',workout_date:'2026-08-03',workout_type:'easy',athlete_notes:'Can we move Friday?'},
    {id:'planned',athlete_id:'cloud-a',workout_date:'2026-08-02',workout_type:'long',prescribed_distance_m:16000,prescribed_zone_label:'Long'},
    {id:'complete',athlete_id:'cloud-a',workout_date:'2026-08-03',workout_type:'easy',total_distance_m:8000,total_duration_sec:2400,source:'strava'}
  ],
  racePlans:[{id:'race1',athleteId:'a',meetName:'Fall Marathon',meetDate:'2026-08-20',distanceM:42195,courseName:'Lakefront'}],
  todayISO:'2026-08-04'
});
eq(queue.length,5,'queue contains represented work only');
deep(queue.map(item=>item.kind),['Athlete note','Athlete report','No completion','Imported activity','Upcoming race']);
ok(queue[0].date<queue[1].date,'same-priority athlete messages are ordered oldest first');
ok(queue.find(item=>item.kind==='Athlete report').detail.includes('Athlete-reported; not interpreted'),'reported values are visibly bounded');
ok(queue.find(item=>item.kind==='No completion').detail.includes('completion is unknown'),'a blank completion is not called missed');
ok(queue.find(item=>item.kind==='Upcoming race').detail.includes('Marathon'),'marathon plan reaches queue');
ok(!queue.some(item=>item.id.includes('ci-done')),'responded check-in leaves queue');

const programSource = [
  extractConst('WORKOUT_TYPES'),
  `const PROGRAM_DAY_INDEX={sun:6,sunday:6,mon:0,monday:0,tue:1,tues:1,tuesday:1,wed:2,wednesday:2,thu:3,thur:3,thurs:3,thursday:3,fri:4,friday:4,sat:5,saturday:5};`,
  extractFn('parseProgramSessionLines'),
  extractFn('normalizeProgramTemplate'),
  extractFn('programSourceRef'),
  extractFn('localIsoDate'),
  extractFn('isoDateAdd'),
  extractFn('mondayForIso'),
  `const programPaceForAthlete=(athlete,type)=>type==='threshold'?255:null;`,
  `const workoutTypeLabel=value=>value;`,
  extractFn('buildProgramWorkoutRows'),
  `return {parseProgramSessionLines,normalizeProgramTemplate,programSourceRef,buildProgramWorkoutRows};`
].join('\n');
const P = new Function(programSource)();
const parsed = P.parseProgramSessionLines(
  '1 | Mon | easy | 5 | Conversational\n1 | Wed | threshold | 6 | 3 x 10 min\n2 | Saturday | long | 12 | Practice fueling',
  2
);
eq(parsed.invalid.length,0);
eq(parsed.sessions.length,3);
eq(parsed.sessions[2].dayIndex,5);
eq(parsed.sessions[1].workoutType,'threshold');
const invalidProgram = P.parseProgramSessionLines('3 | Funday | magic | -1 | nope',2);
deep(invalidProgram.invalid,[1],'bad week/day/type/distance is rejected');
const template = P.normalizeProgramTemplate({
  id:'tpl8',clientRef:'tpl8',name:'Two week build',weeks:2,sessions:parsed.sessions,updatedAt:'2026-08-04T00:00:00Z'
});
eq(template.name,'Two week build');
eq(template.sessions.length,3);
const athlete={id:'a',supabaseId:'cloud-a',name:'Runner A'};
const built=P.buildProgramWorkoutRows(template,athlete,'2026-08-06','coach-1');
eq(built.error,'');
eq(built.startDate,'2026-08-03','assignment aligns to week-one Monday');
deep(built.rows.map(row=>row.workout_date),['2026-08-03','2026-08-05','2026-08-15']);
eq(built.rows[0].prescribed_distance_m,Math.round(5*1609.344));
eq(built.rows[1].prescribed_pace_sec_per_km,255,'individualized target is attached when evidence supports it');
eq(built.rows[0].total_distance_m,null);
eq(built.rows[0].total_duration_sec,null);
eq(built.rows[0].perceived_effort,null);
eq(built.rows[0].source,'coach_entry');
eq(
  P.buildProgramWorkoutRows(template,athlete,'2026-08-06','coach-1').rows[0].source_ref,
  built.rows[0].source_ref,
  'same template, athlete, and start date is idempotent'
);
ok(P.buildProgramWorkoutRows(template,{id:'local-only'},'2026-08-06','coach-1').error,'cloud linkage is required before writes');

const activitySource = [
  extractFn('localIsoDate'),
  extractFn('parseCsvGrid'),
  extractFn('activityDurationSec'),
  extractFn('activityHash'),
  extractFn('activityTypeFromLabel'),
  extractFn('buildActivityImportRows'),
  `return {parseCsvGrid,activityDurationSec,activityTypeFromLabel,buildActivityImportRows};`
].join('\n');
const I = new Function(activitySource)();
eq(I.activityDurationSec('1:02:03'),3723);
eq(I.activityDurationSec('42:30'),2550);
eq(I.activityDurationSec('1:75'),null,'invalid time parts are rejected');
eq(I.activityTypeFromLabel('Morning Long Run'),'long');
eq(I.activityTypeFromLabel('Bike'),'cross_training');
deep(I.parseCsvGrid('Name,Notes\n"Run, Easy","felt ""good"""'),[['Name','Notes'],['Run, Easy','felt "good"']]);
const csv = [
  'Activity ID,Activity Date,Activity Name,Activity Type,Distance,Elapsed Time,Average Heart Rate,Max Heart Rate,Notes',
  '101,2026-08-03,Morning Run,Running,5.00,40:00,145,172,Felt smooth',
  '102,2026-08-04,Long Run,Long Run,10.00,1:25:00,150,175,',
  '102,2026-08-04,Duplicate,Running,10.00,1:25:00,150,175,',
  'bad,not-a-date,Bad Row,Running,0,nope,,,'
].join('\n');
const imported = I.buildActivityImportRows(csv,{provider:'garmin',distanceUnit:'mi',athleteId:'cloud-a',coachId:'coach-1'});
eq(imported.error,'');
eq(imported.rows.length,2);
eq(imported.skipped.length,2);
eq(imported.rows[0].source,'garmin');
eq(imported.rows[0].source_ref,'101');
eq(imported.rows[0].total_distance_m,Math.round(5*1609.344));
eq(imported.rows[0].total_duration_sec,2400);
eq(imported.rows[0].avg_hr_bpm,145);
eq(imported.rows[0].prescribed_distance_m,null);
eq(imported.rows[0].prescribed_notes,null);
ok(!('readiness' in imported.rows[0]),'activity import does not infer readiness');
ok(I.buildActivityImportRows('Name,Distance\nRun,5',{provider:'strava',distanceUnit:'km',athleteId:'a',coachId:'c'}).error,'required headers are enforced');

ok(/data-s="online"/.test(html),'online coaching route is in navigation');
ok(/data-s="programs"/.test(html),'program builder route is in navigation');
ok(/Import CSV/.test(html),'training log surfaces activity import');
ok(/Half Marathon/.test(html)&&/Marathon/.test(html),'Race Command supports long road distances');
ok(/submit_athlete_checkin/.test(html),'athlete check-in uses constrained RPC');
ok(/security definer/i.test(migration),'athlete check-in RPC derives ownership server-side');
ok(/revoke execute on function public\.submit_athlete_checkin[\s\S]*from public/i.test(migration),'anonymous RPC execution is revoked');
ok(/a\.athlete_user_id = auth\.uid\(\)/.test(migration),'athlete writes require the linked athlete account');
ok(/auth\.uid\(\) = coach_id/.test(migration),'coach policies remain account scoped');
ok(/course_adjustment_sec between -1800 and 7200/.test(migration),'database enforces race adjustment bounds');
ok(/carbs_per_hour between 0 and 200/.test(migration),'database enforces coach-entered carbohydrate bounds');

const raceSource = [
  extractConst('XC_DISTANCES'),
  extractFn('parseRaceSegmentLines'),
  extractFn('normalizeXcPlan'),
  extractFn('buildRaceExecutionPlan'),
  `return {parseRaceSegmentLines,normalizeXcPlan,buildRaceExecutionPlan};`
].join('\n');
const R = new Function(raceSource)();
const racePlan = R.normalizeXcPlan({
  meetName:'Chicago',
  meetDate:'2026-10-11',
  distanceM:42195,
  courseAdjustmentSec:99999,
  carbsPerHour:60,
  fluidOzPerHour:20,
  sodiumMgPerHour:500,
  segmentText:'Opening | 13.1 | 100 | Controlled\nClosing | 13.1188 | -100 | Commit'
});
eq(racePlan.distanceM,42195);
eq(racePlan.courseAdjustmentSec,7200,'race adjustment stays inside the explicit coach-entered bound');
eq(racePlan.carbsPerHour,60);
const raceExecution=R.buildRaceExecutionPlan(racePlan,14400);
eq(raceExecution.invalid.length,0);
eq(raceExecution.schedule.length,7,'four-hour race yields seven 30-minute reminders before finish');
eq(raceExecution.totals.carbsG,240);
eq(raceExecution.totals.fluidOz,80);
eq(raceExecution.totals.sodiumMg,2000);
ok(Math.abs(raceExecution.distanceDeltaMi)<0.01,'coach-entered segments reconcile to marathon distance');
eq(raceExecution.segments[0].elevationFt,100,'elevation remains coach-entered context');
deep(
  R.parseRaceSegmentLines('Bad | nope | 10 | cue').map(row=>row.line),
  [1],
  'invalid race segments are reported by source line'
);
ok(!('recommendation' in raceExecution.plan),'race plan does not generate a health or fueling recommendation');

console.log(`online coach probes ok — ${assertions} assertions`);
