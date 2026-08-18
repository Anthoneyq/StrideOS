// ══════════════════════════════════════════════════════════════════════════
// PER-EVENT PR DATE — CLOUD SYNC PROBES (2026-08-17)
// ══════════════════════════════════════════════════════════════════════════
// Peer-review finding: patching only PRESENT dates meant a cleared date left
// the old race_date in the cloud, which resurrected on the next reload; and a
// failed patch still returned {ok:true}. These probes run the REAL
// syncAthleteToSupabase + remoteAthleteToLocal against an in-memory races
// table and assert the full set → clear → reload contract.
// Run: node tests/pr-date-sync-probes.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const main = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).sort((a, b) => b.length - a.length)[0];

const mkEl = () => ({ innerHTML:'', textContent:'', style:{}, value:'', checked:false, dataset:{},
  classList:{ add(){}, remove(){}, contains(){return false}, toggle(){return false} },
  setAttribute(){}, removeAttribute(){}, getAttribute(){return null}, appendChild(){}, addEventListener(){},
  querySelectorAll(){return []}, querySelector(){return null}, scrollIntoView(){}, focus(){} });
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
  requestAnimationFrame:win.requestAnimationFrame, matchMedia:win.matchMedia, URLSearchParams, __out:{}, __fail:{} };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(main, ctx, { filename: 'index.html' });

const stubSrc = `
let TABLES = { athletes: [], races: [] };
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
  const st = { table, op:'select', payload:null, filters:{} };
  const run = () => {
    const fail = __fail[st.table + ':' + st.op];
    if(fail) return { data:null, error:{ message: fail } };
    const rows = TABLES[st.table] || [];
    const hits = rows.filter(r => matches(r, st.filters));
    if(st.op === 'update'){ hits.forEach(r => Object.assign(r, st.payload)); return { data:null, error:null }; }
    if(st.op === 'delete'){ TABLES[st.table] = rows.filter(r => !matches(r, st.filters)); return { data:null, error:null }; }
    return { data: hits.map(r => Object.assign({}, r)), error:null };
  };
  const b = {
    select(){ return b; },
    update(p){ st.op='update'; st.payload=p; return b; },
    delete(){ st.op='delete'; return b; },
    eq(k,v){ st.filters[k]=v; return b; },
    is(k,v){ st.filters[k]=v; return b; },
    in(k,v){ st.filters[k]=v; return b; },
    maybeSingle(){ const r = run(); return Promise.resolve({ data: r.error ? null : (r.data && r.data[0]) || null, error: r.error }); },
    then(res, rej){
      // A REJECTED promise (network throw) is a different failure shape than a
      // returned {error} — the app must map both to {ok:false}.
      const rejMsg = __fail[st.table + ':' + st.op + ':reject'];
      if(rejMsg) return Promise.reject(new Error(rejMsg)).then(res, rej);
      return Promise.resolve(run()).then(res, rej);
    }
  };
  return b;
}
sbClient = {
  from: (t) => builder(t),
  // import_local_athlete writes additional-PR races rows WITHOUT a race_date —
  // the live RPC predates per-event dates. That is the exact gap the JS patch
  // afterward exists to close, so the stand-in reproduces it faithfully.
  rpc: (name, args) => {
    const a = args && args.local_athlete;
    if(name === 'import_local_athlete' && a){
      let row = TABLES.athletes.find(r => r.client_ref === String(a.id));
      if(!row){ row = { id:'row-'+String(a.id), client_ref:String(a.id), coach_id:'coach-1', deleted_at:null }; TABLES.athletes.push(row); }
      row.display_name = a.name; row.race_distance = a.raceDistance || null;
      Object.keys(a.additionalPRs || {}).forEach(ev => {
        let race = TABLES.races.find(r => r.athlete_id === row.id && r.source_ref === 'additional:' + ev);
        if(!race){ race = { id:'race-' + ev, athlete_id: row.id, source:'local_storage_import',
          source_ref:'additional:' + ev, event:ev, time_text:a.additionalPRs[ev],
          time_sec: parseTime(a.additionalPRs[ev]), distance_m: DIST[ev] || null,
          race_date: null, deleted_at: null }; TABLES.races.push(race); }
        race.time_text = a.additionalPRs[ev]; race.time_sec = parseTime(a.additionalPRs[ev]);
      });
    }
    return Promise.resolve({ error: null });
  }
};
sbUser = { id:'coach-1' };
sbCoachReady = true;
__out.raceRow = (ev) => TABLES.races.find(r => r.source_ref === 'additional:' + ev) || null;
__out.athleteRow = () => TABLES.athletes[0] || null;
`;
vm.runInContext(stubSrc, ctx, { filename: 'pr-date-sync-stub' });

const res = [];
const probe = async (label, fn) => {
  try { await fn(); res.push(['OK   ', label, '']); }
  catch (e) { res.push(['FAIL ', label, (e && e.message) || String(e)]); }
};

const athlete = (dates) => ({
  id: 'ath-1', name: 'Test Runner', raceDistance: '5K', raceDistanceM: 5000,
  raceTime: '16:30', raceDate: '2026-08-01', secondaryEvents: [],
  additionalPRs: { '1600m': '4:45', '800m': '2:10' },
  additionalPRDates: dates, inviteEmail: undefined
});

const S = (src) => vm.runInContext(src, ctx);

await probe('set: coach-entered date lands on the additional-PR race row', async () => {
  const r = await S('syncAthleteToSupabase')(athlete({ '1600m': '2026-05-10' }));
  if(!r.ok) throw new Error('sync reported failure: ' + JSON.stringify(r));
  const row = S('__out').raceRow('1600m');
  if(!row || row.race_date !== '2026-05-10') throw new Error('race_date not written: ' + JSON.stringify(row));
});

await probe('undated event is explicitly null, not left untouched', async () => {
  const row = S('__out').raceRow('800m');
  if(!row || row.race_date !== null) throw new Error('800m race_date should be null: ' + JSON.stringify(row));
});

await probe('clear: removing the date writes NULL to the cloud (no resurrection)', async () => {
  const r = await S('syncAthleteToSupabase')(athlete({}));   // date cleared locally
  if(!r.ok) throw new Error('sync reported failure');
  const row = S('__out').raceRow('1600m');
  if(!row || row.race_date !== null) throw new Error('cleared date persisted in cloud: ' + JSON.stringify(row));
});

await probe('reload: remoteAthleteToLocal reflects the cleared state', async () => {
  await S('syncAthleteToSupabase')(athlete({ '1600m': '2026-05-10' }));
  const out = S('__out');
  let local = S('remoteAthleteToLocal')(out.athleteRow(), S('__out').tables().races);
  if((local.additionalPRDates || {})['1600m'] !== '2026-05-10') throw new Error('set date lost on reload: ' + JSON.stringify(local.additionalPRDates));
  await S('syncAthleteToSupabase')(athlete({}));
  local = S('remoteAthleteToLocal')(out.athleteRow(), S('__out').tables().races);
  if((local.additionalPRDates || {})['1600m']) throw new Error('cleared date resurrected on reload: ' + JSON.stringify(local.additionalPRDates));
});

await probe('failure: a failed date patch fails the sync (no silent ok)', async () => {
  S('__fail')['races:update'] = 'RLS says no';
  const r = await S('syncAthleteToSupabase')(athlete({ '1600m': '2026-05-10' }));
  delete S('__fail')['races:update'];
  if(r.ok) throw new Error('sync returned ok despite failed race_date patch');
});

await probe('rejection: a REJECTED date patch promise also fails the sync', async () => {
  S('__fail')['races:update:reject'] = 'network down';
  const r = await S('syncAthleteToSupabase')(athlete({ '1600m': '2026-05-10' }));
  delete S('__fail')['races:update:reject'];
  if(r.ok) throw new Error('sync returned ok despite rejected race_date patch');
});

let fail = 0;
for (const [st, label, msg] of res){ console.log(st, label, msg); if(st.trim() === 'FAIL') fail++; }
if (fail){ console.log(`\n${fail} FAILING`); process.exit(1); }
console.log(`\npr date sync probes ok — ${res.length} probes`);
