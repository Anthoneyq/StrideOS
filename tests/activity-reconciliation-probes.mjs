// Activity Inbox executable contracts.
// Imported evidence stays distinct from plans and cross-provider matches remain
// reversible coach-reviewed suggestions, never compliance/readiness conclusions.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260808120000_activity_reconciliation.sql',import.meta.url),'utf8');
const syncFn=fs.readFileSync(new URL('../supabase/functions/strava-sync-activities/index.ts',import.meta.url),'utf8');
const callbackFn=fs.readFileSync(new URL('../supabase/functions/strava-oauth-callback/index.ts',import.meta.url),'utf8');
let assertions=0;
const ok=(value,message)=>{assertions++;assert.ok(value,message);};
const eq=(actual,expected,message)=>{assertions++;assert.equal(actual,expected,message);};

function extractBlock(source,start,open,close){
  let depth=0;
  for(let index=start;index<source.length;index++){
    if(source[index]===open) depth++;
    else if(source[index]===close&&--depth===0) return source.slice(start,index+1);
  }
  throw new Error(`unbalanced ${open}${close}`);
}

function extractFn(name){
  const signature=`function ${name}(`,at=html.indexOf(signature);
  assert.ok(at>=0,`missing function ${name}`);
  const body=html.indexOf('{',html.indexOf(')',at));
  return html.slice(at,body)+extractBlock(html,body,'{','}');
}

function extractConst(name){
  const signature=`const ${name} = [`,at=html.indexOf(signature);
  assert.ok(at>=0,`missing const ${name}`);
  const start=at+signature.length-1;
  return `const ${name} = ${extractBlock(html,start,'[',']')};`;
}

const source=[
  extractConst('ACTIVITY_EVIDENCE_SOURCES'),
  extractFn('localIsoDate'),
  extractFn('workoutHasCompletion'),
  extractFn('workoutHasPrescription'),
  extractFn('activitySourceLabel'),
  extractFn('activityReconciliationModel'),
  'return {activitySourceLabel,activityReconciliationModel};'
].join('\n');
const R=new Function(source)();

eq(R.activitySourceLabel('strava'),'Strava direct sync','direct sync provenance is explicit');
eq(R.activitySourceLabel('strava_csv'),'Strava CSV export','CSV provenance is not presented as direct sync');
eq(R.activitySourceLabel('garmin'),'Garmin CSV export · legacy record','legacy Garmin rows stay truthfully labeled');

const rows=[
  {id:'plan',source:'coach_entry',workout_date:'2026-08-08',workout_type:'easy',prescribed_distance_m:8000,created_at:'2026-08-01T00:00:00Z'},
  {id:'strava',source:'strava',source_ref:'s1',workout_date:'2026-08-08',total_distance_m:8000,total_duration_sec:2400,created_at:'2026-08-08T12:00:00Z'},
  {id:'garmin',source:'garmin_csv',source_ref:'g1',workout_date:'2026-08-08',total_distance_m:8030,total_duration_sec:2445,created_at:'2026-08-08T12:10:00Z'},
  {id:'unmatched',source:'strava_csv',source_ref:'s2',workout_date:'2026-08-07',total_distance_m:5000,total_duration_sec:1500,created_at:'2026-08-07T12:00:00Z'},
  {id:'linked',source:'strava',source_ref:'s0',workout_date:'2026-08-06',total_distance_m:6000,total_duration_sec:1800,reconciliation_status:'linked',deleted_at:'2026-08-07T00:00:00Z',reconciled_at:'2026-08-07T00:00:00Z'}
];
const model=R.activityReconciliationModel(rows);
eq(model.counts.pending,3,'all unresolved imported evidence reaches the inbox');
eq(model.counts.possibleDuplicate,1,'close cross-provider evidence is only flagged as possible duplicate');
eq(model.counts.possiblePlan,1,'a same-date completion can be suggested for a plan');
eq(model.pending.find(item=>item.workout.id==='garmin').classification,'possible_duplicate');
eq(model.pending.find(item=>item.workout.id==='strava').classification,'possible_plan');
eq(model.pending.find(item=>item.workout.id==='unmatched').classification,'unassigned');
eq(model.pending.find(item=>item.workout.id==='garmin').planCandidates[0].id,'plan','possible duplicate still preserves an explicit plan choice');
eq(model.resolved.length,1,'resolved evidence remains available for undo');
ok(!JSON.stringify(model).match(/readiness|compliance|recommendation/i),'model does not generate a coaching or health conclusion');

ok(/default 'unreviewed'/.test(migration),'new provider evidence enters review by database default');
ok(/'strava_csv','garmin_csv','manual_import'/.test(migration),'database preserves distinct CSV provenance');
ok((migration.match(/security definer/gi)||[]).length===4,'all reconciliation writes are server-authorized RPCs');
ok(/imported\.coach_id <> uid or planned\.coach_id <> uid/.test(migration),'plan linking requires coach ownership of both records');
ok(/duplicate_row\.coach_id <> uid or canonical_row\.coach_id <> uid/.test(migration),'duplicate hiding requires coach ownership of both records');
ok(/completion_workout_id = imported\.id/.test(migration),'linked plan records exact raw completion provenance');
ok(/completion_source=null,completion_source_ref=null,completion_workout_id=null/.test(migration),'undo clears copied completion provenance');
ok(/deleted_at=null/.test(migration),'undo restores raw provider evidence');
ok(/guard_linked_completion_evidence/.test(migration)&&/undo the link before editing it/.test(migration),'linked completion evidence is editable, so undo can erase newer manual edits');
ok(/before insert or update on public\.workouts\s+for each row execute function public\.guard_linked_completion_evidence/.test(migration),'the linked-evidence guard trigger is not installed on both insert and update');
ok(/reconciliation provenance can only change through the reconciliation actions/.test(migration),'direct writes can clear or replace reconciliation provenance');
eq((migration.match(/set_config\('stride\.reconciliation_rpc', '1', true\)/g)||[]).length,4,'every reconciliation RPC must mark its transaction for the provenance guard');
ok(/current_setting\('stride\.reconciliation_rpc', true\)/.test(migration),'the guard does not read the transaction-local RPC marker');
const saveWorkoutSource=extractFn('saveWorkout');
ok(/existingWorkout\.completion_workout_id/.test(saveWorkoutSource)&&/undo the link in Reconcile before editing them/.test(saveWorkoutSource),'the workout form lets a coach edit linked completion evidence');
ok(/row\.total_distance_m = existingWorkout\.total_distance_m/.test(saveWorkoutSource),'an unchanged linked-plan save can still clobber derived completion fields');
eq((migration.match(/revoke execute on function public\./g)||[]).length,4,'anonymous execution is revoked for every reconciliation RPC');

ok(!/reconciliation_status\s*:/.test(syncFn),'Strava resync does not reopen a resolved activity');
ok(!/reconciliation_status\s*:/.test(callbackFn),'OAuth callback upsert does not reopen a resolved activity');
ok(/Same-day and cross-provider matches are suggestions only/.test(html),'UI states the coach-reviewed evidence boundary');
ok(/This is not proof that the inbox is clear/.test(html),'load failure cannot masquerade as a clear inbox');
ok(/Undo remains available/.test(html)&&/returned to review/.test(html),'resolution actions are visibly reversible');
ok(/completion_workout_id/.test(html)&&/Undo the linked activity in Activity Inbox before deleting this plan/.test(html),'linked plan deletion is guarded');
ok(/STRAVA DIRECT/.test(html)&&/STRAVA CSV/.test(html)&&/GARMIN CSV/.test(html),'training log exposes provider provenance');

console.log(`activity reconciliation probes ok — ${assertions} assertions`);
