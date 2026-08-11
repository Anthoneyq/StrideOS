// Six-week Training Response Ledger behavioral contracts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
let assertions=0;const ok=(value,message)=>{assertions++;assert.ok(value,message);};const eq=(actual,expected,message)=>{assertions++;assert.equal(actual,expected,message);};
function block(source,start,open,close){let depth=0;for(let index=start;index<source.length;index++){if(source[index]===open)depth++;else if(source[index]===close&&--depth===0)return source.slice(start,index+1);}throw new Error(`unbalanced ${open}${close}`);}
function fn(name){const at=html.indexOf(`function ${name}(`);assert.ok(at>=0,`missing ${name}`);const body=html.indexOf('{',html.indexOf(')',at));return html.slice(at,body)+block(html,body,'{','}');}
const engine=new Function([
  fn('localIsoDate'),fn('isoDateAdd'),fn('mondayForIso'),fn('normalizeCheckIn'),fn('workoutHasCompletion'),fn('workoutHasPrescription'),fn('teamCalendarWorkoutKey'),fn('trainingResponseModel'),'return {trainingResponseModel};'
].join('\n'))();
const athletes=[{id:'a1',supabaseId:'cloud-a1',name:'Avery'},{id:'a2',supabaseId:'cloud-a2',name:'Sofia'}];
const workouts=[
  {id:'done',athlete_id:'cloud-a1',workout_date:'2026-08-04',source:'strava',total_distance_m:8000,total_duration_sec:2400},
  {id:'done',athlete_id:'cloud-a1',workout_date:'2026-08-04',source:'strava',total_distance_m:8000,total_duration_sec:2400},
  {id:'unknown',athlete_id:'cloud-a1',workout_date:'2026-07-29',source:'coach_entry',prescribed_distance_m:10000},
  {id:'future',athlete_id:'cloud-a1',workout_date:'2026-08-12',source:'coach_entry',prescribed_notes:'Easy'},
  {id:'linked',athlete_id:'cloud-a2',workout_date:'2026-08-05',source:'coach_entry',prescribed_distance_m:6000,total_distance_m:6100,total_duration_sec:1900,completion_source:'garmin_csv'},
  {id:'standalone',athlete_id:'cloud-a2',workout_date:'2026-08-06',source:'athlete_entry',total_distance_m:5000,total_duration_sec:1500}
];
const checkIns=[
  {id:'old',athleteId:'a1',weekOf:'2026-08-03',submittedAt:'2026-08-03T08:00:00Z',energy:2,soreness:4,confidence:2},
  {id:'new',athlete_id:'cloud-a1',week_of:'2026-08-03',submitted_at:'2026-08-04T08:00:00Z',energy:4,soreness:2,confidence:4}
];
const model=engine.trainingResponseModel({athletes,workouts,checkIns,todayISO:'2026-08-10',weeks:6,athleteId:'all'});
eq(model.weekStarts.length,6,'ledger must keep a six-week horizon');
eq(model.rows.length,2,'all-roster model lost an athlete');
eq(model.totals.completed,3,'represented completions must deduplicate workout copies');
eq(model.totals.planned,1,'future prescriptions must remain planned');
eq(model.totals.unknown,1,'past blank prescriptions must remain unknown');
eq(model.totals.reports,1,'duplicate weekly reports must collapse to latest');
eq(model.totals.distanceM,19100,'distance must sum represented completion only');
const a1=model.rows.find(row=>row.athlete.id==='a1');
const reportCell=a1.cells.find(cell=>cell.weekStart==='2026-08-03');
eq(reportCell.completed,1,'same workout was counted twice');
eq(reportCell.reported.energy,4,'latest represented athlete report did not win');
eq(a1.cells.find(cell=>cell.weekStart==='2026-07-27').unknown,1,'past prescription became something other than unknown');
const filtered=engine.trainingResponseModel({athletes,workouts,checkIns,todayISO:'2026-08-10',weeks:6,athleteId:'a2'});
eq(filtered.rows.length,1,'athlete filter leaked another row');
eq(filtered.totals.completed,2,'filtered completion count is wrong');
ok(!JSON.stringify(model).match(/adherence|readiness|fatigue|injury|recommendation/i),'model generated an interpretation instead of a ledger');
ok(/trainingResponseLedgerHTML\(DB\.athletes\|\|\[\],rows\.workouts,rows\.checkIns\)/.test(html),'Online Coach does not render the response ledger');
ok(/role="region" aria-label="Six-week training response ledger"/.test(html),'response ledger lacks an accessible scroll region');
ok(/does not calculate adherence, readiness, fatigue, injury risk, or a training recommendation/.test(html),'response boundary is missing');
ok(/Unrepresented training remains unknown/.test(html),'unrepresented activity boundary is missing');
console.log(`training response probes ok — ${assertions} assertions`);
