// ══════════════════════════════════════════════════════════════════════════
// SPLIT TABLE REP-DISTANCE PROBES (2026-08-17)
// ══════════════════════════════════════════════════════════════════════════
// Locks the Kyle-request coverage: 300m and 400m splits must be populated on
// every quality zone (Tempo, Threshold, Critical Velocity, Race Pace, VO2 Max,
// Speed) across every surface a coach reads them from — the on-screen Coach
// Split Table, the on-screen Training Groups tables, the printed pace card,
// and the printed group sheet. A coach on a 300m track must never have to do
// the split math by hand.
//
// Sprint is a DOCUMENTED EXCEPTION: it stops at 300m (a 400m rep at 115–125%
// of race pace is a glycolytic time trial, not a stride). A probe locks the
// exception so it can only change deliberately.
//
// Same VM harness pattern as screen-render-probes.mjs: the single-file app can
// only be proven by running it.
//
// Run: node tests/split-table-rep-probes.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const main = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).sort((a, b) => b.length - a.length)[0];

const mkClassList = () => { const set = new Set(); return {
  add(c){ set.add(c); }, remove(c){ set.delete(c); }, contains(c){ return set.has(c); },
  toggle(c, force){ const on = force === undefined ? !set.has(c) : Boolean(force);
    if(on) set.add(c); else set.delete(c); return on; } }; };
const mkEl = () => ({ innerHTML: '', textContent: '', style: {}, classList: mkClassList(),
  setAttribute(){}, removeAttribute(){}, getAttribute(){ return null; }, appendChild(){}, addEventListener(){},
  querySelectorAll(){ return []; }, querySelector(){ return null; }, scrollIntoView(){}, focus(){}, value: '', checked: false, dataset: {} });
const store = {};
const doc = { getElementById: (id) => store[id] || (store[id] = mkEl()), querySelectorAll: () => [], querySelector: () => null,
  createElement: () => mkEl(), addEventListener(){}, body: mkEl(), documentElement: mkEl(), head: mkEl(), title: '', readyState: 'complete' };
const ls = { _d: {}, getItem(k){ return this._d[k] ?? null; }, setItem(k, v){ this._d[k] = String(v); }, removeItem(k){ delete this._d[k]; } };
const win = { addEventListener(){}, matchMedia: () => ({ matches: false, addEventListener(){}, addListener(){} }),
  location: { hash: '', search: '', pathname: '/', href: 'http://localhost/' }, history: { replaceState(){}, pushState(){} },
  localStorage: ls, sessionStorage: ls, scrollTo(){}, navigator: { userAgent: 'node', clipboard: { writeText: async () => {} } },
  print(){}, open(){ return null; }, requestAnimationFrame: (f) => setTimeout(f, 0) };
const ctx = { document: doc, window: win, localStorage: ls, sessionStorage: ls, navigator: win.navigator, location: win.location,
  history: win.history, console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval(){},
  fetch: async () => ({ ok: false, json: async () => ({}) }), alert(){}, confirm: () => true, prompt: () => null,
  requestAnimationFrame: win.requestAnimationFrame, matchMedia: win.matchMedia, URLSearchParams, __store: store, __res: [] };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
try { vm.runInContext(main, ctx, { filename: 'index.html' }); } catch (e) { console.log('LOAD ERROR:', e.message); }

const probeSrc = `
const mk=(o)=>Object.assign({id:'a_'+Math.random().toString(36).slice(2), secondaryEvents:[], additionalPRs:{}, guardrail:'standard', weeklyMileage:null, trainingAge:4, raceDate:'2026-05-01', age:'17', sex:'F', grade:'JR'}, o);
DB = { athletes:[
  mk({name:'Riley Chen',primaryEvent:'5K',raceDistance:'5K',raceDistanceM:5000,raceTime:'15:25.27',weeklyMileage:55}),
  mk({name:'Jo Ellis',primaryEvent:'1600m',raceDistance:'1600m',raceDistanceM:1600,raceTime:'5:20.00'})
], activeAthleteId:null };
DB.activeAthleteId = DB.athletes[0].id;
A = DB.athletes[0];
saveDB = function(){}; toast = function(){}; sbSubscription = { tier:'pro', hasProAccess:true }; sbUser = { id:'c1' }; sbRole = null;
const probe=(label,fn)=>{ try{ fn(); __res.push(['OK   ',label,'']); }catch(e){ __res.push(['FAIL ',label,(e&&e.message)||String(e)]); } };

// A cell is "populated" when it holds a digit-bearing time, not the em-dash.
const isTime = s => /\\d/.test(s) && !/—/.test(s);
// Split a rendered <table> body row for one zone into its <td> texts.
const rowCells = (tableHtml, zoneLabel) => {
  const rows = tableHtml.split(/<tr[\\s>]/).filter(r => r.includes('>'+zoneLabel+'<') || r.includes('>'+zoneLabel+' '));
  if(rows.length !== 1) throw new Error(zoneLabel+': matched '+rows.length+' rows');
  return [...rows[0].matchAll(/<td[^>]*>([\\s\\S]*?)<\\/td>/g)].map(m => m[1].replace(/<[^>]*>/g,' ').trim());
};

// ── SOURCE-OF-TRUTH ZONE DATA ──
probe('zones: Tempo/Threshold/CV carry 300m AND 400m reps', ()=>{
  ['Tempo','Threshold','Critical Velocity'].forEach(l=>{
    const z = STRIDE_COACH_SPLITS.find(x=>x.label===l);
    if(!z.reps.includes(300)) throw new Error(l+' missing 300');
    if(!z.reps.includes(400)) throw new Error(l+' missing 400');
  });
});
probe('zones: Race Pace/VO2 Max/Speed carry 300m AND 400m reps', ()=>{
  ['Race Pace','VO2 Max','Speed'].forEach(l=>{
    const z = STRIDE_COACH_SPLITS.find(x=>x.label===l);
    if(!z.reps.includes(300)) throw new Error(l+' missing 300');
    if(!z.reps.includes(400)) throw new Error(l+' missing 400');
  });
});
probe('zones: Sprint stops at 300m (documented exception — no 400m time trial)', ()=>{
  const z = STRIDE_COACH_SPLITS.find(x=>x.label==='Sprint');
  if(!z.reps.includes(300)) throw new Error('Sprint missing 300');
  if(z.reps.includes(400)) throw new Error('Sprint gained 400 — that is a deliberate-decision change, update the doc comment and this probe together');
});

// ── ON-SCREEN COACH SPLIT TABLE ──
// Column order = zone label, Per Mile, then the sorted union of rep distances.
const T = buildDanielsTable(A);
const allReps = [...new Set(STRIDE_COACH_SPLITS.flatMap(z=>z.reps))].sort((a,b)=>a-b);
const col = d => 2 + allReps.indexOf(d);   // td index of a rep-distance column
probe('split table: header has 300m and 400m columns', ()=>{
  if(!/>300m</.test(T)) throw new Error('no 300m column');
  if(!/>400m</.test(T)) throw new Error('no 400m column');
});
['Tempo','Threshold','Critical Velocity','Race Pace','VO2 Max','Speed'].forEach(l=>{
  probe('split table: '+l+' row populates 300m and 400m for a 5K anchor', ()=>{
    const cells = rowCells(T, l);
    if(!isTime(cells[col(300)])) throw new Error(l+' 300m cell = "'+cells[col(300)]+'"');
    if(!isTime(cells[col(400)])) throw new Error(l+' 400m cell = "'+cells[col(400)]+'"');
  });
});
probe('split table: Threshold 300m split is the zone math, not a stray value', ()=>{
  const cells = rowCells(T, 'Threshold');
  const secPerM = parseTime(A.raceTime) / A.raceDistanceM;
  const z = STRIDE_COACH_SPLITS.find(x=>x.label==='Threshold');
  const expected = secPerM * 300 * pctToMult(effectiveZonePct(z, A, getActiveGuardrail()));
  const got = parseTime(cells[col(300)].replace(/[^0-9:.]/g,''));
  if(!(got > expected*0.9 && got < expected*1.1)) throw new Error('300m split '+got+'s vs expected ~'+expected.toFixed(1)+'s');
});
probe('split table: Sprint row shows — at 400m (exception rendered, not broken)', ()=>{
  const cells = rowCells(T, 'Sprint');
  if(isTime(cells[col(400)])) throw new Error('Sprint 400m unexpectedly populated: "'+cells[col(400)]+'"');
  if(!isTime(cells[col(300)])) throw new Error('Sprint 300m should be populated');
});

// In every group/print surface the rep-distance cells are the LAST
// repCols.length tds of the row (label/PR/mile cells come first), so exact
// per-distance indexing is stable regardless of how many lead cells a
// surface uses.
const repCell = (cells, repCols, d) => {
  const i = repCols.indexOf(d);
  if(i < 0) throw new Error(d+' not in repCols '+JSON.stringify(repCols));
  return cells.slice(-repCols.length)[i];
};

// ── PRINTED PACE CARD ──
// repCols is hardcoded in paceCardPrintHTML; assert it via the header, then
// index the exact 300m/400m cells of the Threshold row.
probe('pace card print: exact 300m and 400m Threshold cells populated', ()=>{
  const P = paceCardPrintHTML(A);
  const PACE_CARD_REPS = [300, 400, 800, 1000, 1200, 1600];
  PACE_CARD_REPS.forEach(d=>{ const l = d===1600?'1600m':d+'m';
    if(!P.includes('>'+l+'<')) throw new Error('missing header column '+l); });
  const cells = rowCells(P, 'Threshold');
  [300, 400].forEach(d=>{
    const c = repCell(cells, PACE_CARD_REPS, d);
    if(!isTime(c)) throw new Error('Threshold '+d+'m cell = "'+c+'"');
  });
});

// ── PRINTED GROUP SHEET (default columns) ──
// One row per athlete; assert BOTH fixture athletes' exact 300m/400m target
// cells hold times (Riley 5K anchor, Jo 1600m anchor — both threshold-legal).
probe('group sheet print: exact 300m and 400m cells populated per athlete', ()=>{
  const G = groupSheetPrintHTML({ name:'Group A', label:'Group A', groupLabel:'Group A',
    paceLo:330, paceHi:345, medianRefSec: parseTime(A.raceTime),
    members:[{ athlete:A }, { athlete:DB.athletes[1] }] });
  const SHEET_REPS = [300, 400, 800, 1000, 1200, 1600];
  SHEET_REPS.forEach(d=>{ const l = d===1600?'1600m':d+'m';
    if(!G.includes('>'+l+'<')) throw new Error('missing header column '+l); });
  ['Riley Chen','Jo Ellis'].forEach(name=>{
    const cells = rowCells(G, name);
    [300, 400].forEach(d=>{
      const c = repCell(cells, SHEET_REPS, d);
      if(!isTime(c)) throw new Error(name+' '+d+'m cell = "'+c+'"');
    });
  });
});

// ── ON-SCREEN TRAINING GROUPS (renderSquads) ──
// Row = zone-label td, /mi td, then one td per repCols entry; index the exact
// 300m/400m cells for each quality zone rendered in the group tables.
probe('training groups screen: exact 300m and 400m zone cells populated', ()=>{
  renderSquads();
  const h = String(__store['sq-body'] ? __store['sq-body'].innerHTML : '');
  if(!h) throw new Error('sq-body empty');
  const SQUAD_REPS = [300, 400, 800, 1000, 1200, 1600];
  // renderSquads headers are bare numbers ("300"), not "300m"
  [300, 400].forEach(d=>{ if(!new RegExp('>'+d+'<').test(h)) throw new Error('no '+d+' header column'); });
  ['Tempo','Threshold','Critical Velocity'].forEach(label=>{
    const cells = rowCells(h, label);
    [300, 400].forEach(d=>{
      const c = repCell(cells, SQUAD_REPS, d);
      if(!isTime(c)) throw new Error(label+' '+d+'m cell = "'+c+'"');
    });
  });
});
`;

try { vm.runInContext(probeSrc, ctx, { filename: 'split-table-rep-probes' }); }
catch (e) { console.log('PROBE ERROR:', e.stack || e.message); process.exit(1); }

let fail = 0;
for (const [st, label, msg] of ctx.__res) {
  console.log(st, label, msg);
  if (st.trim() === 'FAIL') fail++;
}
if (fail) { console.log(`\n${fail} FAILING`); process.exit(1); }
console.log(`\nsplit table rep probes ok — ${ctx.__res.length} probes`);
