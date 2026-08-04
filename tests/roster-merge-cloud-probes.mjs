// ══════════════════════════════════════════════════════════════════════════
// ROSTER MERGE — CLOUD PERSISTENCE PROBES (2026-08-04)
// ══════════════════════════════════════════════════════════════════════════
// Anthoney: "every time i log in i have to re-merge athletes."
//
// The duplicate merge only ever wrote localStorage. loadRemoteAthletes()
// replaces DB.athletes wholesale from Supabase at every sign-in, so the
// absorbed rows came back and the same merge had to be redone forever.
//
// These probes run the REAL applyDuplicateRepair() out of index.html in a VM
// with a recording Supabase stub, and assert the merge reaches the cloud:
// survivor upserted, workouts re-pointed, absorbed rows soft-deleted — and in
// that order, so no workout is stranded on a deleted athlete.
//
// Run: node tests/roster-merge-cloud-probes.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const main = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).sort((a, b) => b.length - a.length)[0];

const mkClassList = () => { const set = new Set(); return {
  add(c){set.add(c)}, remove(c){set.delete(c)}, contains(c){return set.has(c)},
  toggle(c,f){ const on = f===undefined ? !set.has(c) : Boolean(f); if(on) set.add(c); else set.delete(c); return on; } }; };
const mkEl = () => ({ innerHTML:'', textContent:'', style:{}, classList:mkClassList(),
  setAttribute(){}, removeAttribute(){}, getAttribute(){return null}, appendChild(){}, addEventListener(){},
  querySelectorAll(){return []}, querySelector(){return null}, scrollIntoView(){}, focus(){}, value:'', checked:false, dataset:{} });
const store = {};
const doc = { getElementById:(id)=>store[id]||(store[id]=mkEl()), querySelectorAll:()=>[], querySelector:()=>null,
  createElement:()=>mkEl(), addEventListener(){}, body:mkEl(), documentElement:mkEl(), head:mkEl(), title:'', readyState:'complete' };
const ls = {_d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]}};
const win = { addEventListener(){}, matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
  location:{hash:'',search:'',pathname:'/',href:'http://localhost/'}, history:{replaceState(){},pushState(){}},
  localStorage:ls, sessionStorage:ls, scrollTo(){}, navigator:{userAgent:'node',clipboard:{writeText:async()=>{}}},
  print(){}, open(){return null}, requestAnimationFrame:(f)=>setTimeout(f,0) };
const ctx = { document:doc, window:win, localStorage:ls, sessionStorage:ls, navigator:win.navigator, location:win.location,
  history:win.history, console, setTimeout, clearTimeout, setInterval:()=>0, clearInterval(){},
  fetch:async()=>({ok:false,json:async()=>({})}), alert(){}, confirm:()=>true, prompt:()=>null,
  requestAnimationFrame:win.requestAnimationFrame, matchMedia:win.matchMedia, URLSearchParams, __store:store, __calls:[], __out:{},
  __fail:{ workouts:false }, __toasts:[], __confirms:[] };
ctx.confirm = (msg) => { ctx.__confirms.push(String(msg)); return true; };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(main, ctx, { filename: 'index.html' });

// ── Recording Supabase stub ────────────────────────────────────────────────
// Every athlete row's cloud id is 'uuid_' + its client_ref, so a probe can
// assert exactly which row was written to without a real database.
const stubSrc = `
const calls = __calls;
function resolveSelect(st){
  if(st.table === 'athletes'){
    const ref = st.filters['client_ref'];
    return ref ? { id: 'uuid_' + ref } : [];
  }
  return [];
}
// Injectable failure: __fail.workouts makes the workout re-point error, the
// case where soft-deleting anyway would orphan a season of training history.
function errFor(st){
  if(__fail.workouts && st.table === 'workouts' && st.op === 'update') return { message: 'permission denied' };
  return null;
}
function builder(table){
  const st = { table, op:'select', payload:null, filters:{} };
  const b = {
    select(){ return b; },
    update(p){ st.op='update'; st.payload=p; return b; },
    delete(){ st.op='delete'; return b; },
    insert(p){ st.op='insert'; st.payload=p; return b; },
    eq(k,v){ st.filters[k]=v; return b; },
    is(k,v){ st.filters[k]=v; return b; },
    in(k,v){ st.filters[k]=v; return b; },
    order(){ return b; },
    maybeSingle(){ calls.push(st); return Promise.resolve({ data: resolveSelect(st), error: errFor(st) }); },
    then(res, rej){ calls.push(st); return Promise.resolve({ data: resolveSelect(st), error: errFor(st) }).then(res, rej); }
  };
  return b;
}
sbClient = { from: (t) => builder(t), rpc: (name, args) => { calls.push({ table:'rpc:'+name, op:'rpc', payload:args, filters:{} }); return Promise.resolve({ error: null }); } };
sbUser = { id: 'coach-1' };
sbCoachReady = true;
sbRole = null;

const mk = (o) => Object.assign({ secondaryEvents:[], additionalPRs:{}, guardrail:null, weeklyMileage:null,
  trainingAge:0, raceDate:'', age:'', sex:'', grade:'', inviteEmail:'' }, o);
DB = { athletes:[
  mk({ id:'r1', supabaseId:'uuid_r1', name:'Riley Chen', createdAt:'2026-01-01', raceDistance:'5K',   raceDistanceM:5000, raceTime:'16:25.50' }),
  mk({ id:'r2', supabaseId:'uuid_r2', name:'Riley Chen', createdAt:'2026-01-02', raceDistance:'1600m',raceDistanceM:1600, raceTime:'4:52.46' }),
  mk({ id:'r3', supabaseId:'uuid_r3', name:'Riley Chen', createdAt:'2026-01-03', raceDistance:'3200m',raceDistanceM:3200, raceTime:'9:43.74' }),
  mk({ id:'d1', supabaseId:'uuid_d1', name:'Dana Ruiz',  createdAt:'2026-01-04', raceDistance:'800m', raceDistanceM:800,  raceTime:'1:53.51' })
], workouts:[{ id:'w1', athleteId:'r3', date:'2026-02-01' }], activeAthleteId:'r3' };
A = DB.athletes[2];

saveDB = function(){}; toast = function(m){ __toasts.push(String(m)); }; renderRoster = function(){};
refreshActiveAthlete = function(){}; updateChip = function(){};
requireCoachWorkspace = function(){ return true; };
// The post-merge re-read is proven by its own probe below; here it must not
// clobber the merged DB the assertions inspect.
let reloaded = 0;
let reloadOk = true;
__out.setReloadOk = (v) => { reloadOk = v; };
loadRemoteAthletes = async function(){ reloaded++; __out.reloaded = reloaded; return { ok: reloadOk, reason: reloadOk ? '' : 'remote_load_failed' }; };

// Re-runnable fixture so a failure scenario starts from the same roster.
const seed = () => { DB = { athletes:[
  mk({ id:'r1', supabaseId:'uuid_r1', name:'Riley Chen', createdAt:'2026-01-01', raceDistance:'5K',   raceDistanceM:5000, raceTime:'16:25.50' }),
  mk({ id:'r2', supabaseId:'uuid_r2', name:'Riley Chen', createdAt:'2026-01-02', raceDistance:'1600m',raceDistanceM:1600, raceTime:'4:52.46' }),
  mk({ id:'r3', supabaseId:'uuid_r3', name:'Riley Chen', createdAt:'2026-01-03', raceDistance:'3200m',raceDistanceM:3200, raceTime:'9:43.74' }),
  mk({ id:'d1', supabaseId:'uuid_d1', name:'Dana Ruiz',  createdAt:'2026-01-04', raceDistance:'800m', raceDistanceM:800,  raceTime:'1:53.51' })
], workouts:[{ id:'w1', athleteId:'r3', date:'2026-02-01' }], activeAthleteId:'r3' }; A = DB.athletes[2]; };
__out.seed = seed;

__out.run = (async () => {
  await applyDuplicateRepair();
  return { names: DB.athletes.map(a => a.name), ids: DB.athletes.map(a => a.id),
           workoutAthleteIds: (DB.workouts||[]).map(w => w.athleteId), activeAthleteId: DB.activeAthleteId };
})();
`;
vm.runInContext(stubSrc, ctx, { filename: 'probe.js' });
const result = await ctx.__out.run;
const calls = ctx.__calls;

let assertions = 0;
function ok(cond, msg){ assertions++; if(!cond) throw new Error('PROBE FAIL: ' + msg); }

const find = (p) => calls.filter(p);

// ── The local merge still behaves ─────────────────────────────────────────
ok(result.names.filter(n => n === 'Riley Chen').length === 1, 'three Riley rows should merge into one (got ' + JSON.stringify(result.names) + ')');
ok(result.names.includes('Dana Ruiz'), 'a single-entry athlete must be left alone');
ok(result.ids.includes('r1'), 'the earliest entry id survives so training-log history stays attached');
ok(result.workoutAthleteIds.every(id => id === 'r1'), 'local workouts re-point to the survivor');
ok(result.activeAthleteId === 'r1', 'the active athlete follows the merge instead of pointing at an absorbed id');

// ── The merge reaches the cloud (the actual bug) ──────────────────────────
const upserts = find(c => c.table === 'rpc:import_local_athlete');
ok(upserts.length === 1, 'the survivor is upserted to Supabase exactly once (got ' + upserts.length + ')');
ok(upserts[0].payload && upserts[0].payload.local_athlete.id === 'r1', 'the upsert carries the surviving athlete');

const softDeletes = find(c => c.table === 'athletes' && c.op === 'update' && c.payload && c.payload.deleted_at);
const deletedIds = softDeletes.flatMap(c => [].concat(c.filters.id || [])).sort();
ok(deletedIds.length === 2, 'both absorbed rows are soft-deleted server-side (got ' + JSON.stringify(deletedIds) + ')');
ok(deletedIds.join(',') === 'uuid_r2,uuid_r3', 'exactly the absorbed rows are deleted: ' + JSON.stringify(deletedIds));
ok(softDeletes.every(c => c.filters.coach_id === 'coach-1'), 'a soft-delete is always scoped to the signed-in coach');
ok(!deletedIds.includes('uuid_r1') && !deletedIds.includes('uuid_d1'), 'never soft-delete the survivor or an untouched athlete');
// Batched, not one request per row: 236 entries → 13 athletes must not become
// hundreds of sequential round-trips a coach can abandon half way through.
ok(softDeletes.length === 1, 'absorbed rows are deleted in ONE batched request per athlete (got ' + softDeletes.length + ')');

const repoints = find(c => c.table === 'workouts' && c.op === 'update' && c.payload && c.payload.athlete_id);
ok(repoints.length === 1, 'workouts are re-pointed in one batched request per athlete (got ' + repoints.length + ')');
ok(repoints.every(c => c.payload.athlete_id === 'uuid_r1'), 'workouts move onto the surviving cloud row');
ok([].concat(repoints[0].filters.athlete_id).sort().join(',') === 'uuid_r2,uuid_r3', 'workouts are moved off exactly the absorbed rows');
ok(repoints[0].filters.deleted_at === null, 'already-deleted workouts are left alone');

// The roster shown after a merge must be what the cloud actually holds.
ok(ctx.__out.reloaded === 1, 'a successful merge re-reads the roster from Supabase');

// Order matters: soft-deleting first would strand the workouts.
const perGroup = calls.filter(c => (c.table === 'workouts' && c.op === 'update') || (c.table === 'athletes' && c.op === 'update' && c.payload && c.payload.deleted_at));
for(let i = 0; i < perGroup.length; i += 2){
  ok(perGroup[i].table === 'workouts' && perGroup[i+1].table === 'athletes',
     'each absorbed row is re-pointed then deleted, in that order');
}

// ── The coach is told the cloud is being changed ──────────────────────────
const confirmText = ctx.__confirms.join(' ');
ok(/cloud/i.test(confirmText), 'the confirmation names the cloud write: ' + JSON.stringify(ctx.__confirms));
ok(!/cloud copies are not changed/i.test(html),
   'the old "cloud copies are not changed" promise is gone from the preview — the same action writes to Supabase');
ok(/also updates your account in the cloud/i.test(html),
   'the merge preview discloses the cloud write');
const successToasts = ctx.__toasts.join(' | ');
ok(/saved to your account/i.test(successToasts), 'a verified merge says it was saved: ' + successToasts);

// ── A failed workout re-point must NOT delete the absorbed rows ───────────
// Duplicates on screen are recoverable; orphaned training history is not.
ctx.__calls.length = 0; ctx.__toasts.length = 0;
vm.runInContext(`
  __fail.workouts = true; __out.seed();
  __out.wfail = applyDuplicateRepair();
`, ctx, { filename: 'probe-workout-fail.js' });
await ctx.__out.wfail;
const failCalls = ctx.__calls;
const failDeletes = failCalls.filter(c => c.table === 'athletes' && c.op === 'update' && c.payload && c.payload.deleted_at);
ok(failDeletes.length === 0, 'no athlete is soft-deleted when its workouts could not be re-pointed (got ' + failDeletes.length + ')');
ok(failCalls.some(c => c.table === 'workouts' && c.op === 'update'), 'the re-point was attempted before giving up');
const failToasts = ctx.__toasts.join(' | ');
ok(!/saved to your account/i.test(failToasts), 'a failed re-point never reports the merge as saved: ' + failToasts);
ok(/did not sync|come back/i.test(failToasts), 'the coach is told the merge did not fully sync: ' + failToasts);

// ── A failed post-merge re-read must not claim "saved" ────────────────────
ctx.__calls.length = 0; ctx.__toasts.length = 0;
vm.runInContext(`
  __fail.workouts = false; __out.setReloadOk(false); __out.seed();
  __out.rfail = applyDuplicateRepair();
`, ctx, { filename: 'probe-reload-fail.js' });
await ctx.__out.rfail;
const reloadToasts = ctx.__toasts.join(' | ');
ok(!/saved to your account/i.test(reloadToasts), 'unverified merges are never announced as saved: ' + reloadToasts);
ok(/could not be re-read|reload to confirm/i.test(reloadToasts), 'the coach is told the result is unverified: ' + reloadToasts);

// ── Signed out: the merge must not silently claim to have synced ──────────
vm.runInContext(`
  sbClient = null; sbUser = null; sbCoachReady = false;
  __out.offline = persistDuplicateMergeToCloud([{ id:'r1' }], [{ id:'r2', supabaseId:'uuid_r2', survivorLocalId:'r1' }]);
`, ctx, { filename: 'probe-offline.js' });
const offline = await ctx.__out.offline;
ok(offline.skipped === true, 'with no cloud session the merge reports skipped, not success');
ok(offline.ok === false, 'a local-only merge is never reported as ok');

console.log(`roster merge cloud probes ok — ${assertions} assertions`);
