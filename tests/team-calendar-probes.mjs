// Team Calendar behavioral contract probes.
// Run: node tests/team-calendar-probes.mjs
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let passed=0;
const failures=[];
const check=(condition,message)=>condition?passed++:failures.push(message);

function extractBlock(source,startIdx,openChar,closeChar){
  let depth=0;
  for(let index=startIdx;index<source.length;index++){
    if(source[index]===openChar) depth++;
    else if(source[index]===closeChar){
      depth--;
      if(depth===0) return source.slice(startIdx,index+1);
    }
  }
  throw new Error(`unbalanced ${openChar}${closeChar}`);
}

function extractFn(name){
  const sig=`function ${name}(`;
  const at=html.indexOf(sig);
  if(at<0) throw new Error(`${name} not found`);
  const signatureEnd=html.indexOf(')',at);
  const body=html.indexOf('{',signatureEnd);
  return html.slice(at,body)+extractBlock(html,body,'{','}');
}

let engine;
try{
  engine=new Function([
    extractFn('localIsoDate'),
    extractFn('isoDateAdd'),
    extractFn('mondayForIso'),
    extractFn('normalizeSeasonRacePlan'),
    extractFn('seasonRacePlanKey'),
    extractFn('seasonBoardModel'),
    extractFn('teamCalendarWorkoutKey'),
    extractFn('teamCalendarModel'),
    'return {teamCalendarModel,seasonBoardModel};'
  ].join('\n'))();
  passed++;
}catch(error){
  failures.push(`calendar functions must remain pure/extractable: ${error.message}`);
}

if(engine){
  const athletes=[
    {id:'a1',supabaseId:'cloud-a1',name:'Avery'},
    {id:'a2',supabaseId:'cloud-a2',name:'Sofia'}
  ];
  const workouts=[
    {id:'dup',athlete_id:'cloud-a1',workout_date:'2026-08-03',workout_type:'easy',prescribed_notes:'local copy'},
    {id:'dup',athlete_id:'cloud-a1',workout_date:'2026-08-03',workout_type:'easy',prescribed_notes:'remote copy'},
    {id:'done',athlete_id:'cloud-a2',workout_date:'2026-08-04',workout_type:'threshold',prescribed_notes:'3 x 8 min',total_duration_sec:2400},
    {id:'unknown',athlete_id:'cloud-a1',workout_date:'2026-08-05',workout_type:'long',prescribed_distance_m:16000},
    {id:'future',athlete_id:'cloud-a2',workout_date:'2026-08-09',workout_type:'race',prescribed_notes:'Meet'}
  ];
  const racePlans=[
    {athleteId:'a1',meetName:'Falcon Invite',meetDate:'2026-08-08',distanceM:5000,courseName:'North Park'},
    {athlete_id:'cloud-a1',race_name:'Falcon Invite',race_date:'2026-08-08',distance_m:5000,course_name:'North Park'},
    {athlete_id:'cloud-a2',race_name:'Falcon Invite',race_date:'2026-08-08',distance_m:3200,course_name:'North Park'},
    {athleteId:'a2',meetName:'September Classic',meetDate:'2026-09-05',distanceM:5000}
  ];
  const model=engine.teamCalendarModel({athletes,workouts,racePlans,weekStart:'2026-08-03',athleteId:'all',todayISO:'2026-08-07'});
  check(model.days.length===7,'calendar must always render seven days');
  check(model.weekStart==='2026-08-03'&&model.weekEnd==='2026-08-09','calendar week boundary is wrong');
  check(model.days.reduce((sum,day)=>sum+day.entries.length,0)===4,'duplicate local/remote workout was not collapsed');
  check(model.counts.completed===1,'completed count must come from completion evidence');
  check(model.counts.unknown===2,'past prescriptions without completion must remain unknown');
  check(model.counts.planned===1,'future prescription must be planned');
  check(model.counts.athletes===2,'represented athlete count is wrong');
  check(model.counts.meets===1,'same meet should aggregate into one weekly overlay');
  check(model.days.find(day=>day.date==='2026-08-08').meets[0].athleteCount===2,'meet overlay should represent two distinct athletes');
  check(model.days.find(day=>day.date==='2026-08-08').meets[0].entries.length===2,'local/cloud copies of one race plan were not deduplicated');
  const filtered=engine.teamCalendarModel({athletes,workouts,racePlans,weekStart:'2026-08-03',athleteId:'a2',todayISO:'2026-08-07'});
  check(filtered.days.reduce((sum,day)=>sum+day.entries.length,0)===2,'athlete filter leaked another athlete');
  check(filtered.days.find(day=>day.date==='2026-08-08').meets[0].athleteCount===1,'athlete filter leaked another meet entry');
  check(JSON.stringify(model).match(/\bmissed\b/i)===null,'model must not infer a missed workout');
  check(JSON.stringify(model).match(/\breadiness|fatigue|injury|recovery score\b/i)===null,'model inferred health/readiness state');
  const season=engine.seasonBoardModel({athletes,racePlans,todayISO:'2026-08-07',horizonDays:84,athleteId:'all'});
  check(season.meets.length===2,'12-week board should include and group both future meets');
  check(season.counts.entries===3,'season entry count must deduplicate local/cloud copies');
  check(season.meets[0].distanceMs.join(',')==='3200,5000','meet distances should remain factual and sorted');
  check(JSON.stringify(season).match(/\bselection|readiness|availability|priority\b/i)===null,'season model inferred a coaching conclusion');
}

check(/teamCalendarHTML\(DB\.athletes\|\|\[\],rows\.workouts,rows\.racePlans\)/.test(html),'coach queue does not render race plans on the team calendar');
check(/seasonBoardHTML\(DB\.athletes\|\|\[\],rows\.racePlans\)/.test(html),'coach queue does not render the 12-week season board');
check(/role="region" aria-label="Team training calendar/.test(html),'calendar lacks a labeled scroll region');
check(/Past prescriptions without completion evidence stay labeled unknown/.test(html),'calendar interpretation boundary is missing');
check(/This is schedule context—not selection, readiness, availability, or meet priority/.test(html),'season interpretation boundary is missing');
check(/function openSeasonRacePlan\(encodedPlanKey\)/.test(html),'season meet cannot open its represented Race Command plan');
check(/function openWorkoutForm\(workoutId,presetDate\)/.test(html),'calendar cannot prefill a scheduled date');
check(/if\(currentScreen==='online'\) renderOnlineCoach\(\)/.test(html),'saving from calendar does not refresh the calendar');

if(failures.length){
  failures.forEach(message=>console.error('FAIL '+message));
  process.exit(1);
}
console.log(`team calendar probes ok — ${passed} assertions`);
