// ══════════════════════════════════════════════════════════════════════════
// ROSTER MERGE — CLOUD PERSISTENCE PROBES (2026-08-04)
// ══════════════════════════════════════════════════════════════════════════
// Anthoney: "every time i log in i have to re-merge athletes."
//
// The duplicate merge only ever wrote localStorage. loadRemoteAthletes()
// replaces DB.athletes wholesale from Supabase at every sign-in, so the
// absorbed rows came back and the same merge had to be redone forever.
//
// These probes run the REAL applyDuplicateRepair() out of index.html against a
// small in-memory stand-in for the athletes/workouts tables, so a probe can
// assert what the DATABASE ends up holding — not merely which calls were made.
// The stand-in models the traits that actually bit us:
//   · athletes.id is independent of athletes.client_ref (never inferable)
//   · an update can succeed having changed zero rows (RLS filtering)
//   · a select can return { error } instead of throwing
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
  fetch:async()=>({ok:false,json:async()=>({})}), alert(){}, prompt:()=>null,
  requestAnimationFrame:win.requestAnimationFrame, matchMedia:win.matchMedia, URLSearchParams,
  __store:store, __calls:[], __out:{}, __fail:{}, __toasts:[], __confirms:[] };
ctx.confirm = (msg) => { ctx.__confirms.push(String(msg)); return true; };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(main, ctx, { filename: 'index.html' });

// ── In-memory Supabase stand-in ───────────────────────────────────────────
const stubSrc = `
const calls = __calls;
let TABLES = { athletes: [], workouts: [] };
__out.tables = () => TABLES;

function matches(row, filters){
  return Object.keys(filters).every(k => {
    const want = filters[k];
    const have = row[k] === undefined ? null : row[k];
    if(Array.isArray(want)) return want.indexOf(have) >= 0;
    return have === want;
  });
}
function builder(table){
  const st = { table, op:'select', payload:null, filters:{}, returning:false };
  const run = () => {
    calls.push(st);
    const fail = __fail[st.table + ':' + st.op];
    if(fail) return { data: null, error: { message: fail } };
    const hits = (TABLES[st.table] || []).filter(r => matches(r, st.filters));
    if(st.op === 'update'){
      // Zero-row success: the shape an RLS-filtered update returns.
      const changed = __fail.zeroRows ? [] : hits;
      // phantomDelete: the write REPORTS the rows as changed but they are still
      // there on the next read — the case a call-log-only probe cannot see.
      const phantom = __fail.phantomDelete && st.table === 'athletes' && st.payload && st.payload.deleted_at;
      if(!phantom) changed.forEach(r => Object.assign(r, st.payload));
      return { data: st.returning ? changed.map(r => ({ id: r.id })) : null, error: null };
    }
    return { data: hits.map(r => Object.assign({}, r)), error: null };
  };
  const b = {
    select(){ if(st.op === 'update') st.returning = true; return b; },
    update(p){ st.op='update'; st.payload=p; return b; },
    delete(){ st.op='delete'; return b; },
    insert(p){ st.op='insert'; st.payload=p; return b; },
    eq(k,v){ st.filters[k]=v; return b; },
    is(k,v){ st.filters[k]=v; return b; },
    in(k,v){ st.filters[k]=v; return b; },
    order(){ return b; },
    maybeSingle(){ const r = run(); return Promise.resolve({ data: r.error ? null : (r.data && r.data[0]) || null, error: r.error }); },
    then(res, rej){ return Promise.resolve(run()).then(res, rej); }
  };
  return b;
}
sbClient = { from: (t) => builder(t),
  // import_local_athlete is an upsert keyed on client_ref: model the fields the
  // roster round-trip depends on, so a probe can prove a value SURVIVES the
  // write + re-read rather than merely that a call was made.
  rpc: (name, args) => {
    calls.push({ table:'rpc:'+name, op:'rpc', payload:args, filters:{} });
    const a = args && args.local_athlete;
    if(name === 'import_local_athlete' && a){
      let row = TABLES.athletes.find(r => r.client_ref === String(a.id));
      if(!row){ row = { id:'row-new-'+String(a.id), client_ref:String(a.id), coach_id:'coach-1', deleted_at:null }; TABLES.athletes.push(row); }
      row.display_name = a.name;
      row.training_age_years = Number(a.trainingAge) || 0;
      row.race_date = a.raceDate || row.race_date || null;
    }
    return Promise.resolve({ error: null });
  } };
sbUser = { id: 'coach-1' };
sbCoachReady = true;
sbRole = null;

const mk = (o) => Object.assign({ secondaryEvents:[], additionalPRs:{}, guardrail:null, weeklyMileage:null,
  trainingAge:0, raceDate:'', age:'', sex:'', grade:'', inviteEmail:'' }, o);

// r4's client_ref is uuid-SHAPED but is not its row id — the exact case where
// inferring "uuid local id == cloud row id" would target a nonexistent row.
const UUID_REF = '11111111-1111-4111-8111-111111111111';
const ROWS = [
  { local:'r0', row:'row-a0', ref:'r0',     name:'Riley Chen', created:'2026-01-01', ev:'',      m:null, t:'',          d:'',           g:'7th' },
  { local:'r1', row:'row-a1', ref:'r1',     name:'Riley Chen', created:'2026-01-01', ev:'5K',    m:5000, t:'16:25.50', d:'2023-11-06', g:'FR' },
  { local:'r2', row:'row-a2', ref:'r2',     name:'Riley Chen', created:'2026-01-02', ev:'1600m', m:1600, t:'4:52.46', d:'2023-04-01', g:'SO' },
  { local:'r3', row:'row-a3', ref:'r3',     name:'Riley Chen', created:'2026-01-03', ev:'3200m', m:3200, t:'9:43.74', d:'2024-05-11', g:'JR' },
  { local:UUID_REF, row:'row-a4', ref:UUID_REF, name:'Riley Chen', created:'2026-01-04', ev:'800m', m:800, t:'2:05.00', d:'2026-03-02', g:'SR' },
  { local:'d1', row:'row-d1', ref:'d1',     name:'Dana Ruiz',  created:'2026-01-05', ev:'800m',  m:800,  t:'1:53.51', d:'2025-05-02', g:'SR' }
];
const seed = () => {
  TABLES = {
    athletes: ROWS.map(r => ({ id:r.row, client_ref:r.ref, coach_id:'coach-1', deleted_at:null, display_name:r.name, race_date:r.d, grade:r.g || null })),
    workouts: [{ id:'w1', athlete_id:'row-a3', coach_id:'coach-1', deleted_at:null },
               { id:'w2', athlete_id:'row-a4', coach_id:'coach-1', deleted_at:null }]
  };
  DB = { athletes: ROWS.map(r => mk({ id:r.local, supabaseId:r.row, name:r.name, createdAt:r.created,
           raceDistance:r.ev, raceDistanceM:r.m, raceTime:r.t, raceDate:r.d, grade:r.g || '' })),
         workouts:[{ id:'w1', athleteId:'r3', date:'2026-02-01' }], activeAthleteId:'r3' };
  A = DB.athletes[2];
};
__out.seed = seed;
__out.UUID_REF = UUID_REF;
seed();

saveDB = function(){}; toast = function(m){ __toasts.push(String(m)); }; renderRoster = function(){};
refreshActiveAthlete = function(){}; updateChip = function(){};
requireCoachWorkspace = function(){ return true; };

// The re-read is the REAL contract: rebuild the local roster from whatever the
// table now holds, exactly as loadRemoteAthletes does after a sign-in. A merge
// that did not truly delete its rows therefore reappears here.
let reloadOk = true;
__out.setReloadOk = (v) => { reloadOk = v; };
__out.reloads = 0;
loadRemoteAthletes = async function(){
  __out.reloads++;
  if(!reloadOk) return { ok:false, reason:'remote_load_failed' };
  DB.athletes = TABLES.athletes.filter(r => !r.deleted_at)
    .map(r => mk({ id: r.client_ref || r.id, supabaseId: r.id, name: r.display_name,
                   trainingAge: r.training_age_years || 0 }));
  return { ok:true, reason:'' };
};

const LIVE_CLIENT = sbClient;
__out.repair = (scenario) => (async () => {
  // Probe 8 signs the session out; restore it so this scenario is not silently
  // testing the signed-out path.
  sbClient = LIVE_CLIENT; sbUser = { id:'coach-1' }; sbCoachReady = true; sbRole = null;
  __calls.length = 0; __toasts.length = 0;
  Object.keys(__fail).forEach(k => delete __fail[k]);
  Object.assign(__fail, scenario || {});
  __out.seed();
  // The state a coach is actually in: already merged, every athlete at 0 yrs.
  DB.athletes = [ mk({ id:'r0', supabaseId:'row-a0', name:'Riley Chen', trainingAge:0 }),
                  mk({ id:'d1', supabaseId:'row-d1', name:'Dana Ruiz',  trainingAge:0 }) ];
  await loadTrainingAgeArchive();
  const preview = JSON.parse(JSON.stringify(trainingAgeRepair));
  if(preview.stage === 'preview') await applyTrainingAgeRepair();
  return { preview, ages: DB.athletes.map(a => [a.name, a.trainingAge]),
           grades: DB.athletes.map(a => [a.name, a.grade]),
           rpcs: __calls.filter(c => c.op === 'rpc').map(c => c.payload.local_athlete.trainingAge),
           toasts: __toasts.slice() };
})();

__out.run = (scenario) => (async () => {
  __calls.length = 0; __toasts.length = 0;
  Object.keys(__fail).forEach(k => delete __fail[k]);
  Object.assign(__fail, scenario || {});
  __out.setReloadOk(scenario && scenario.reloadFails ? false : true);
  __out.seed();
  await applyDuplicateRepair();
  return {
    names: DB.athletes.map(a => a.name),
    ids: DB.athletes.map(a => a.id),
    workoutAthleteIds: (DB.workouts||[]).map(w => w.athleteId),
    activeAthleteId: DB.activeAthleteId,
    liveRows: TABLES.athletes.filter(r => !r.deleted_at).map(r => r.id).sort(),
    deletedRows: TABLES.athletes.filter(r => r.deleted_at).map(r => r.id).sort(),
    workoutOwners: TABLES.workouts.map(w => w.athlete_id).sort(),
    trainingAges: DB.athletes.map(a => [a.name, a.trainingAge]),
    calls: __calls.map(c => ({ table:c.table, op:c.op, filters:c.filters, payload:c.payload })),
    toasts: __toasts.slice()
  };
})();
`;
vm.runInContext(stubSrc, ctx, { filename: 'probe.js' });

let assertions = 0;
function ok(cond, msg){ assertions++; if(!cond) throw new Error('PROBE FAIL: ' + msg); }
const run = (scenario) => ctx.__out.run(scenario);
const UUID_REF = ctx.__out.UUID_REF;

// ══ 1. The happy path ═════════════════════════════════════════════════════
const good = await run();
ok(good.names.filter(n => n === 'Riley Chen').length === 1, 'four Riley rows merge into one (got ' + JSON.stringify(good.names) + ')');
ok(good.names.includes('Dana Ruiz'), 'a single-entry athlete is left alone');
ok(good.ids.includes('r0'), 'the earliest entry id survives so training-log history stays attached: ' + JSON.stringify(good.ids));
ok(good.activeAthleteId === 'r0', 'the active athlete follows the merge instead of pointing at an absorbed id: ' + good.activeAthleteId);

ok(good.deletedRows.join(',') === 'row-a1,row-a2,row-a3,row-a4', 'exactly the absorbed CLOUD ROWS are soft-deleted: ' + JSON.stringify(good.deletedRows));
ok(good.liveRows.join(',') === 'row-a0,row-d1', 'the survivor and the untouched athlete remain: ' + JSON.stringify(good.liveRows));
ok(good.workoutOwners.every(id => id === 'row-a0'), 'every workout moved onto the surviving row: ' + JSON.stringify(good.workoutOwners));

// A uuid-shaped client_ref must be resolved through the table, never assumed.
ok(!good.calls.some(c => c.table === 'athletes' && c.op === 'update' && [].concat(c.filters.id || []).includes(UUID_REF)),
   'a uuid-shaped client_ref is never used as a row id');
ok(good.deletedRows.includes('row-a4'), 'the uuid-client_ref athlete is still resolved to its real row and deleted');

// Batched: 236 entries → 13 athletes must not be hundreds of round-trips.
const deleteCalls = good.calls.filter(c => c.table === 'athletes' && c.op === 'update' && c.payload && c.payload.deleted_at);
const repointCalls = good.calls.filter(c => c.table === 'workouts' && c.op === 'update');
ok(deleteCalls.length === 1, 'absorbed rows are deleted in ONE batched request per athlete (got ' + deleteCalls.length + ')');
ok(repointCalls.length === 1, 'workouts are re-pointed in one batched request per athlete (got ' + repointCalls.length + ')');
ok(deleteCalls[0].filters.coach_id === 'coach-1', 'a soft-delete is always scoped to the signed-in coach');
ok(good.calls.findIndex(c => c.table === 'workouts' && c.op === 'update') <
   good.calls.findIndex(c => c.table === 'athletes' && c.op === 'update' && c.payload && c.payload.deleted_at),
   'workouts are re-pointed BEFORE their athlete rows are deleted');
ok(/saved to your account/i.test(good.toasts.join(' | ')), 'a verified merge reports saved: ' + good.toasts.join(' | '));

// ══ 2. Disclosure: the coach is told the cloud is being changed ═══════════
const confirmText = ctx.__confirms.join(' ');
ok(/cloud/i.test(confirmText), 'the confirmation names the cloud write: ' + JSON.stringify(ctx.__confirms.slice(0,1)));
ok(!/cloud copies are not changed/i.test(html), 'the old "cloud copies are not changed" promise is gone from the source');
ok(/also updates your account in the cloud/i.test(html), 'the merge preview discloses the cloud write');
ok(/not reachable right now/i.test(html), 'signed-in-but-cloud-unavailable is worded differently from signed out');

// ══ 3. A failed workout re-point must NOT delete the absorbed rows ════════
// Duplicates on screen are recoverable; orphaned training history is not.
const wfail = await run({ 'workouts:update': 'permission denied' });
ok(wfail.deletedRows.length === 0, 'no athlete row is deleted when its workouts could not be re-pointed: ' + JSON.stringify(wfail.deletedRows));
ok(wfail.workoutOwners.includes('row-a3'), 'the workouts stay attached to their original rows');
ok(!/saved to your account/i.test(wfail.toasts.join(' | ')), 'a failed re-point never reports the merge as saved: ' + wfail.toasts.join(' | '));
ok(/did not sync|come back/i.test(wfail.toasts.join(' | ')), 'the coach is told the merge did not sync: ' + wfail.toasts.join(' | '));

// ══ 4. A lookup that returns { error } is a failure, not "nothing found" ══
const lfail = await run({ 'athletes:select': 'network error' });
ok(lfail.deletedRows.length === 0, 'a failed lookup deletes nothing: ' + JSON.stringify(lfail.deletedRows));
ok(!/saved to your account/i.test(lfail.toasts.join(' | ')), 'a failed lookup never reports saved: ' + lfail.toasts.join(' | '));

// ══ 5. A zero-row "successful" update is not a merge ══════════════════════
// Supabase returns success having changed nothing when RLS filters the rows.
const zero = await run({ zeroRows: true });
ok(zero.deletedRows.length === 0, 'the stand-in really did change nothing');
ok(!/saved to your account/i.test(zero.toasts.join(' | ')), 'a zero-row update is never reported as saved: ' + zero.toasts.join(' | '));
ok(/did not sync|came back|come back/i.test(zero.toasts.join(' | ')), 'the coach is warned the duplicates persist: ' + zero.toasts.join(' | '));

// ══ 6. A re-read that still contains duplicates is not "saved" ════════════
// The delete REPORTS success for every row, yet the rows survive. Only reading
// the roster back catches this — a call-log assertion never would.
const phantom = await run({ phantomDelete: true });
ok(phantom.deletedRows.length === 0, 'the stand-in kept the rows despite reporting success');
ok(phantom.names.filter(n => n === 'Riley Chen').length > 1,
   'the re-read brings the duplicates back (got ' + JSON.stringify(phantom.names) + ')');
ok(!/saved to your account/i.test(phantom.toasts.join(' | ')),
   'a merge whose duplicates survive the re-read is never reported as saved: ' + phantom.toasts.join(' | '));
ok(/came back/i.test(phantom.toasts.join(' | ')),
   'the coach is told the duplicates came back: ' + phantom.toasts.join(' | '));

// ══ 7. A failed re-read leaves the result unverified ═════════════════════
const rfail = await run({ reloadFails: true });
ok(!/saved to your account/i.test(rfail.toasts.join(' | ')), 'unverified merges are never announced as saved: ' + rfail.toasts.join(' | '));
ok(/could not be re-read|reload to confirm/i.test(rfail.toasts.join(' | ')), 'the coach is told the result is unverified: ' + rfail.toasts.join(' | '));

// ══ 8. Signed out: no silent claim of a sync ══════════════════════════════
vm.runInContext(`
  sbClient = null; sbUser = null; sbCoachReady = false;
  __out.offline = persistDuplicateMergeToCloud([{ id:'r1' }], [{ id:'r2', supabaseId:'row-a2', survivorLocalId:'r1' }]);
`, ctx, { filename: 'probe-offline.js' });
const offline = await ctx.__out.offline;
ok(offline.skipped === true, 'with no cloud session the merge reports skipped, not success');
ok(offline.ok === false, 'a local-only merge is never reported as ok');

// ══ 9. Years training is derived, never left as a false 0.0 ══════════════
// A per-race-row import stored no training age, so 13 real multi-season
// runners merged at "0.0yr" and landed on beginner guardrails.
ok(good.trainingAges.some(([n, v]) => n === 'Riley Chen' && v === 5),
   'the merge derives years training from the span of the group (2021→2026 = 5): ' + JSON.stringify(good.trainingAges));
ok(!/\$\{\(a\.trainingAge\|\|0\)\.toFixed\(1\)\}yr/.test(html),
   'the roster card no longer prints an unknown training age as the fact "0.0yr"');
ok(/yrs not set/.test(html) && /years training not set/.test(html),
   'an unknown training age reads as not set, on both the card and the hero');

// The repair for a roster ALREADY merged at 0: derive from archived seasons.
const rep = await ctx.__out.repair();
ok(rep.preview.stage === 'preview', 'the repair previews before writing: ' + rep.preview.stage);
const riley = rep.preview.plan.find(p => p.name === 'Riley Chen');
const dana  = rep.preview.plan.find(p => p.name === 'Dana Ruiz');
ok(riley && riley.years === 5, 'the derived span is first→last season on file: ' + JSON.stringify(riley));
// A floor, not an estimate: one season on file is one year of training, and
// the coach is told it rests on a single season so they can raise it.
ok(dana && dana.years === 1, 'one season on file reads as one year, not zero: ' + JSON.stringify(dana));
ok(dana.flags.some(f => /only 1 season on file/.test(f)), 'the thin evidence is flagged: ' + JSON.stringify(dana.flags));
// Grades are a season signal too: the 7th-grade row carries NO date, so a
// dates-only span would have said 5 (2021→2026) — here both agree at 5, and
// the flag tells the coach which signal carried it.
// Elizabeth Leachman's real shape: middle-school seasons carry a grade but a
// dash for PR_Date, so a dates-only span understated her career by a year.
ok(riley.dateSpan === 3 && riley.gradeSpan === 5,
   'both signals are computed independently: ' + JSON.stringify(riley));
ok(riley.years === 5, 'the WIDER signal wins — a missing date can hide a season, never invent one');
ok(riley.flags.some(f => /no dated results/.test(f)),
   'the coach is told which signal carried it: ' + JSON.stringify(riley.flags));
ok(Array.isArray(riley.flags), 'each proposal carries coach-facing flags');
ok(rep.preview.plan.every(p => p.flags.some(f => /age still unknown/.test(f))),
   'a missing age is flagged rather than guessed: ' + JSON.stringify(rep.preview.plan.map(p => p.flags)));
ok(rep.ages.some(([n, v]) => n === 'Riley Chen' && v === 5), 'applying sets the local value: ' + JSON.stringify(rep.ages));
ok(rep.ages.some(([n, v]) => n === 'Dana Ruiz' && v === 1), 'a one-season athlete gets the one-year floor: ' + JSON.stringify(rep.ages));
ok(rep.grades.some(([n, g]) => n === 'Dana Ruiz' && g === 'SR'), 'a blank year is backfilled from the most recent season on file: ' + JSON.stringify(rep.grades));
ok(rep.rpcs.includes(5), 'the new value is pushed to the account, not just the device: ' + JSON.stringify(rep.rpcs));
ok(/years training set/i.test(rep.toasts.join(' | ')), 'the coach is told it saved: ' + rep.toasts.join(' | '));

const repFail = await ctx.__out.repair({ 'athletes:select': 'network error' });
ok(repFail.preview.stage === 'error', 'a failed history read is surfaced, not silently empty: ' + repFail.preview.stage);
ok(repFail.ages.every(([, v]) => !(v > 0)), 'nothing is written when the history could not be read: ' + JSON.stringify(repFail.ages));

console.log(`roster merge cloud probes ok — ${assertions} assertions`);
