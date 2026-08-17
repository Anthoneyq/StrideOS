// ══════════════════════════════════════════════════════════════════════════
// SPLIT TABLE REP-DISTANCE PROBES (2026-08-17, full-grid doctrine)
// ══════════════════════════════════════════════════════════════════════════
// Anthoney's decision (2026-08-17, screenshot: "fill out these numbers across
// the charts"): the split tables are a PACE-REFERENCE GRID — every zone shows
// a time at every rep-distance column on every surface (on-screen Coach Split
// Table, Training Groups tables, printed pace card, printed group sheet).
// The coach decides which cells are a sane workout.
//
// Only PHYSICAL guards may blank a cell, and those must render the exact
// em-dash:
//   1. supra-race zones (pct > 100) at/beyond the anchor distance itself —
//      that time would beat the athlete's own PR;
//   2. sprint anchors don't extrapolate long (repAllowedForAnchor).
//
// Same VM harness pattern as screen-render-probes.mjs.
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

const isTime = s => /\\d/.test(s) && !/—/.test(s);
// Split a rendered <table> body row for one zone/name into its <td> texts.
const rowCells = (tableHtml, label) => {
  const rows = tableHtml.split(/<tr[\\s>]/).filter(r => r.includes('>'+label+'<') || r.includes('>'+label+' '));
  if(rows.length !== 1) throw new Error(label+': matched '+rows.length+' rows');
  return [...rows[0].matchAll(/<td[^>]*>([\\s\\S]*?)<\\/td>/g)].map(m => m[1].replace(/<[^>]*>/g,' ').trim());
};
// Rep cells are the LAST repCols.length tds of a row on every surface.
const repCell = (cells, repCols, d) => {
  const i = repCols.indexOf(d);
  if(i < 0) throw new Error(d+' not in repCols '+JSON.stringify(repCols));
  return cells.slice(-repCols.length)[i];
};

// The full-grid expectation for one zone row on one surface: a cell is a
// time unless a PHYSICAL guard applies — supra-race zone (pct > 100) at or
// beyond the anchor's own distance — in which case it is the exact em-dash.
const expectFullRow = (surface, cells, repCols, zoneLabel, anchorM) => {
  const pct = STRIDE_COACH_SPLITS.find(z=>z.label===zoneLabel).pct;
  repCols.forEach(d=>{
    const c = repCell(cells, repCols, d);
    const blocked = pct > 100 && d >= anchorM;
    if(blocked){
      if(c !== '—') throw new Error(surface+' '+zoneLabel+' '+d+'m should be exactly "—" (supra-race at/beyond anchor), got "'+c+'"');
    } else {
      if(!isTime(c)) throw new Error(surface+' '+zoneLabel+' '+d+'m should be a time, got "'+c+'"');
    }
  });
};

// ── ON-SCREEN COACH SPLIT TABLE: every zone × every column ──
const ALL_REPS = [...new Set(STRIDE_COACH_SPLITS.flatMap(z=>z.reps))].sort((a,b)=>a-b);
const T = buildDanielsTable(A);
probe('split table: one column per union rep distance', ()=>{
  ALL_REPS.forEach(d=>{ const l = d===1609?'1mi':(d%1000===0?(d/1000)+'km':d+'m');
    if(!new RegExp('>'+l+'<','i').test(T)) throw new Error('missing column '+l); });
});
STRIDE_COACH_SPLITS.forEach(z=>{
  probe('split table: '+z.label+' row filled across all '+ALL_REPS.length+' distances (physical guards only)', ()=>{
    expectFullRow('split table', rowCells(T, z.label), ALL_REPS, z.label, A.raceDistanceM);
  });
});
probe('split table: Threshold 300m split is the zone math, not a stray value', ()=>{
  const cells = rowCells(T, 'Threshold');
  const secPerM = parseTime(A.raceTime) / A.raceDistanceM;
  const z = STRIDE_COACH_SPLITS.find(x=>x.label==='Threshold');
  const expected = secPerM * 300 * pctToMult(effectiveZonePct(z, A, getActiveGuardrail()));
  const got = parseTime(repCell(cells, ALL_REPS, 300).replace(/[^0-9:.]/g,''));
  if(!(got > expected*0.9 && got < expected*1.1)) throw new Error('300m split '+got+'s vs expected ~'+expected.toFixed(1)+'s');
});
probe('split table: supra-race guard — VO2/Speed/Sprint dash at 5K+ for a 5K anchor', ()=>{
  ['VO2 Max','Speed','Sprint'].forEach(l=>{
    const cells = rowCells(T, l);
    [5000, 8000, 10000].forEach(d=>{
      const c = repCell(cells, ALL_REPS, d);
      if(c !== '—') throw new Error(l+' '+d+'m should be "—" (would beat the PR), got "'+c+'"');
    });
  });
});

// ── PRINTED PACE CARD: every zone × its 6 columns ──
probe('pace card print: every zone row fully populated (all cols below a 5K anchor)', ()=>{
  const P = paceCardPrintHTML(A);
  const PACE_CARD_REPS = [300, 400, 800, 1000, 1200, 1600];
  PACE_CARD_REPS.forEach(d=>{ const l = d===1600?'1600m':d+'m';
    if(!P.includes('>'+l+'<')) throw new Error('missing header column '+l); });
  STRIDE_COACH_SPLITS.forEach(z=>{
    expectFullRow('pace card', rowCells(P, z.label), PACE_CARD_REPS, z.label, A.raceDistanceM);
  });
});
probe('pace card print: mile anchor — supra-race zones dash the 1600 column only', ()=>{
  const P = paceCardPrintHTML(DB.athletes[1]);   // Jo, 1600m 5:20
  const PACE_CARD_REPS = [300, 400, 800, 1000, 1200, 1600];
  STRIDE_COACH_SPLITS.forEach(z=>{
    expectFullRow('pace card (mile anchor)', rowCells(P, z.label), PACE_CARD_REPS, z.label, DB.athletes[1].raceDistanceM);
  });
});

// ── PRINTED GROUP SHEET: one Threshold row per athlete, all columns ──
probe('group sheet print: every athlete row fully populated', ()=>{
  const G = groupSheetPrintHTML({ name:'Group A', label:'Group A', groupLabel:'Group A',
    paceLo:330, paceHi:345, medianRefSec: parseTime(A.raceTime),
    members:[{ athlete:A }, { athlete:DB.athletes[1] }] });
  const SHEET_REPS = [300, 400, 800, 1000, 1200, 1600];
  SHEET_REPS.forEach(d=>{ const l = d===1600?'1600m':d+'m';
    if(!G.includes('>'+l+'<')) throw new Error('missing header column '+l); });
  [['Riley Chen', 5000], ['Jo Ellis', 1600]].forEach(([name, anchorM])=>{
    expectFullRow('group sheet '+name, rowCells(G, name), SHEET_REPS, 'Threshold', anchorM);
  });
});

// ── ON-SCREEN TRAINING GROUPS: every rendered zone × its 6 columns ──
probe('training groups screen: every zone row fully populated', ()=>{
  renderSquads();
  const h = String(__store['sq-body'] ? __store['sq-body'].innerHTML : '');
  if(!h) throw new Error('sq-body empty');
  const SQUAD_REPS = [300, 400, 800, 1000, 1200, 1600];
  // renderSquads headers are bare numbers ("300"), not "300m"
  [300, 400].forEach(d=>{ if(!new RegExp('>'+d+'<').test(h)) throw new Error('no '+d+' header column'); });
  // groupSessionZones keep-set; anchor is the 5K-equivalent group median.
  ['Steady','Tempo','Threshold','Critical Velocity','Race Pace','VO2 Max'].forEach(label=>{
    expectFullRow('training groups', rowCells(h, label), SQUAD_REPS, label, 5000);
  });
});

// ── COACH-ENTERED TARGETS: unaffected by any display rule ──
probe('coach-entered reps still compute (program rates, workout specs)', ()=>{
  const cs = computeZoneSplits(A, { repDists:[1200] });
  const vo2 = cs.zones.find(z=>z.label==='VO2 Max');
  if(!(vo2 && isFinite(vo2.reps[1200]))) throw new Error('VO2 1200m target lost');
  const sprintRate = programPaceForAthlete(A, 'sprint');
  if(!isFinite(sprintRate)) throw new Error('programPaceForAthlete sprint per-1000m rate lost');
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
