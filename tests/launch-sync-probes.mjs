import assert from 'node:assert/strict';
import {appHarness} from './launch-harness.mjs';
const h=appHarness(), {run,ctx,ls,store}=h;
run(`sbUser={id:'coach-a'}; sbCoachReady=true; sbRole=null; sbClient={}; DB=newDB(); DB.accountUserId=sbUser.id;
renderAuthPanel=()=>{}; refreshCurrentScreen=()=>{}; updateChip=()=>{};
__out.writes=[]; __out.fail=true;
writeAthleteToSupabase=async a=>{ __out.writes.push(JSON.parse(JSON.stringify(a))); return {ok:!__out.fail}; };
DB.athletes=[{id:'a',name:'Original',raceTime:'18:00'}];
`);
assert.equal((await run(`syncAthleteToSupabase(DB.athletes[0])`)).ok,false);
assert.equal(JSON.parse(ls.getItem('strideOS_v5_account_coach-a')).pendingAthleteSync.a.athlete.name,'Original');
assert.match(store.syncStatus.innerHTML,/waiting to sync/);
// Reload the local account and then apply both empty and stale cloud reads.
run(`DB=JSON.parse(localStorage.getItem(accountStorageKey(sbUser.id))); sbClient={from:()=>({select(){return this},is(){return this},order:async()=>({data:[],error:null})})};`);
await run('loadRemoteAthletes()');
assert.equal(run('DB.athletes.length'),1);
run(`DB.athletes=mergePendingAthletes([{id:'a',name:'Old cloud copy'}],DB)`);
assert.equal(run('DB.athletes[0].name'),'Original');
ctx.__out.fail=false;
await run('drainAthleteSync()');
assert.equal(run('Object.keys(DB.pendingAthleteSync).length'),0);
assert.equal(JSON.parse(ls.getItem('strideOS_v5_account_coach-a')).pendingAthleteSync.a,undefined);
// A newer edit arriving while the older snapshot is being sent must be sent too.
run(`__out.hold=null; writeAthleteToSupabase=async a=>{__out.writes.push(JSON.parse(JSON.stringify(a))); if(a.name==='First') await new Promise(r=>__out.hold=r); return {ok:true};};`);
const first=run(`syncAthleteToSupabase({id:'a',name:'First'})`);
const second=run(`syncAthleteToSupabase({id:'a',name:'Second'})`);
ctx.__out.hold(); await first; await second;
assert.equal(ctx.__out.writes.at(-1).name,'Second');
assert.equal(run('Object.keys(DB.pendingAthleteSync).length'),0);
// Account switch during an await cannot remove another account's pending work.
run(`writeAthleteToSupabase=async()=>{await new Promise(r=>__out.hold=r);return {ok:true};}`);
const switching=run(`syncAthleteToSupabase({id:'a',name:'Account A'})`);
run(`sbUser={id:'coach-b'}; DB=newDB(); DB.accountUserId='coach-b'; queueAthleteSync({id:'b',name:'Account B'});`);
ctx.__out.hold(); await switching;
assert.equal(run('DB.pendingAthleteSync.b.athlete.name'),'Account B');
assert.equal(JSON.parse(ls.getItem('strideOS_v5_account_coach-a')).pendingAthleteSync.a,undefined);
// A storage exception must not allow the stale on-disk copy to win.
const originalSet=ls.setItem;
ls.setItem=()=>{throw new Error('blocked storage');};
run(`DB.athletes=[{id:'b',name:'Newest memory'}]; saveDB(DB);`);
assert.equal(run('loadDB().athletes[0].name'),'Newest memory');
assert.match(store.syncStatus.innerHTML,/cannot save changes/);
ls.setItem=originalSet;
// Failed deletion does not mutate local athletes/workouts or report success.
run(`DB.athletes=[{id:'b',name:'Keep me'}]; DB.workouts=[{athleteId:'b'}]; requireCoachWorkspace=()=>true; drainAthleteSync=async()=>{}; softDeleteRemoteAthlete=async()=>({ok:false});`);
await run(`deleteAthlete('b')`);
assert.equal(run('DB.athletes.length'),1); assert.equal(run('DB.workouts.length'),1);
assert.match(store.toast.textContent,/Nothing was removed/);
console.log('PASS sync: durable retries, empty/stale reload, concurrent edits, account switching, blocked storage, failed deletion');
// A cloud response for an old account must never replace the new account's DB,
// including the empty-cloud fast path.
{
 const h2=appHarness();
 h2.run(`sbUser={id:'old'};sbRole=null; DB=newDB();DB.accountUserId='old';saveDB(DB); updateChip=()=>{};refreshActiveAthlete=()=>{};
 sbClient={from:()=>({select(){return this},is(){return this},order:()=>new Promise(r=>__out.resolve=r)})};`);
 const read=h2.run('loadRemoteAthletes()');
 h2.run(`sbUser={id:'new'};DB=newDB();DB.accountUserId='new';DB.athletes=[{id:'new-athlete'}];`);
 h2.ctx.__out.resolve({data:[],error:null});
 assert.equal((await read).reason,'account_changed');assert.equal(h2.run('DB.accountUserId'),'new');assert.equal(h2.run('DB.athletes[0].id'),'new-athlete');
}
{
 const h3=appHarness();
 h3.run(`sbUser={id:'linked-user'};sbLinkedAthlete={id:'remote',client_ref:'linked',display_name:'Linked athlete'};sbClient={from:()=>({select(){return this},eq(){return this},is(){return this},maybeSingle:async()=>({data:sbLinkedAthlete}),order:async()=>({data:[]})})};refreshActiveAthlete=()=>{};updateChip=()=>{};`);
 assert.equal(await h3.run('hydrateLinkedAthleteWorkspace()'),true);assert.equal(h3.run('DB.athletes[0].name'),'Linked athlete');
}
console.log('PASS hydration: linked athlete and account-switch isolation');
