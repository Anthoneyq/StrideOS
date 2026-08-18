// ══════════════════════════════════════════════════════════════════════════
// PACE CALCULATOR UI PROBES (2026-08-18, Alex round-2 UX overhaul)
// ══════════════════════════════════════════════════════════════════════════
// Locks the behaviors shipped in the Pace Calculator overhaul:
//   1. backSolvePct is the exact inverse of pctToMult (hero click-to-edit),
//      env factor included, across the whole 60–130% band.
//   2. Quick paces / explicit anchors are ATHLETE-INDEPENDENT: identical
//      inputs give an identical split table no matter which athlete is
//      selected or how their guardrail is set (Codex review, 2026-08-18).
//   3. Quick-paces mode renders the athlete-free calculator (no tier pitch),
//      and athlete mode renders the editable hero + live-update machinery.
//   4. The hero/ladder mile gate follows the EFFECTIVE anchor (current-
//      fitness override), not the raw PR record.
//
// Same VM harness pattern as screen-render-probes.mjs.
// Run: node tests/pace-ui-probes.mjs
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
  mk({name:'Riley Chen',primaryEvent:'5K',raceDistance:'5K',raceDistanceM:5000,raceTime:'15:25.27',weeklyMileage:55,guardrail:'aggressive'}),
  mk({name:'Milo Ortiz',primaryEvent:'1600m',raceDistance:'1600m',raceDistanceM:1600,raceTime:'5:20.00',guardrail:'conservative',age:'14',trainingAge:0.5})
], activeAthleteId:null };
DB.activeAthleteId = DB.athletes[0].id;
A = DB.athletes[0];
saveDB = function(){}; toast = function(){}; sbSubscription = { tier:'pro', hasProAccess:true }; sbUser = { id:'c1' }; sbRole = null;
const probe=(label,fn)=>{ try{ fn(); __res.push(['OK   ',label,'']); }catch(e){ __res.push(['FAIL ',label,(e&&e.message)||String(e)]); } };
const assert=(cond,msg)=>{ if(!cond) throw new Error(msg); };

// ── 1. backSolvePct is the exact inverse of pctToMult ──────────────────────
probe('back-solve: round-trips every whole % from 60 to 130 (no env)', () => {
  const secPerM = 0.2075, rep = 800;               // 5:32 1600m anchor
  for(let pct = 60; pct <= 130; pct++){
    const t = secPerM * rep * pctToMult(pct);
    assert(backSolvePct(t, secPerM, rep, 0) === pct, 'pct ' + pct + ' did not round-trip');
  }
});
probe('back-solve: round-trips with an environmental factor applied', () => {
  const secPerM = 0.2075, rep = 400, env = 0.13;    // 95°F-style slowdown
  for(const pct of [60, 85, 100, 116, 130]){
    const t = secPerM * rep * pctToMult(pct) * (1 + env);
    assert(backSolvePct(t, secPerM, rep, env) === pct, 'pct ' + pct + ' with env did not round-trip');
  }
});
probe('back-solve: 2:20 800 on a 5:32 1600 anchor lands at 116% (headless-verified value)', () => {
  const secPerM = parseTime('5:32') / 1600;
  assert(backSolvePct(parseTime('2:20'), secPerM, 800, 0) === 116, 'expected 116');
});
probe('back-solve: invalid inputs return null, never NaN', () => {
  assert(backSolvePct(0, 0.2, 800, 0) === null, 'zero time');
  assert(backSolvePct(140, 0, 800, 0) === null, 'zero secPerM');
  assert(backSolvePct(140, 0.2, 0, 0) === null, 'zero rep');
});

// ── 2. Explicit anchors are athlete-independent ────────────────────────────
const quickAnchor = () => ({ name:'Anchor', raceDistanceM:800, raceDistance:'800m', raceTime:'2:45', age:null, trainingAge:0, additionalPRs:{}, guardrail:null });
probe('quick paces: identical anchor gives identical table across selected athletes', () => {
  A = DB.athletes[0];                                // aggressive guardrail
  const t1 = buildDanielsTable(quickAnchor());
  A = DB.athletes[1];                                // conservative, youth
  const t2 = buildDanielsTable(quickAnchor());
  assert(t1.length > 500, 'table did not render');
  assert(t1 === t2, 'split table changed with the selected athlete');
});
probe('quick paces: explicit anchor uses neutral guardrail, not the athlete state', () => {
  A = DB.athletes[1];                                // conservative would shift -5
  const t = buildDanielsTable(quickAnchor());
  assert(!/PACE GUARDRAIL/.test(t), 'guardrail badge leaked into an explicit-anchor table');
});
probe('athlete mode: the selected athlete DOES govern the default table', () => {
  A = DB.athletes[1];                                // conservative -5%
  const t = buildDanielsTable();
  assert(/PACE GUARDRAIL · CONSERVATIVE/i.test(t), 'athlete guardrail badge missing from athlete-mode table');
});

// ── 3. Screen modes render the right machinery ─────────────────────────────
probe('quick mode: renders the athlete-free calculator with no tier pitch', () => {
  A = DB.athletes[0];
  pacesMode = 'quick';
  renderPaces();
  const el = document.getElementById('pc-body').innerHTML;
  assert(/Quick paces — any race time, no athlete/.test(el), 'quick banner missing');
  assert(/id="ftD"/.test(el), 'quick calculator inputs missing');
  assert(!/Create a free account/.test(el), 'tier pitch leaked into quick mode');
});
probe('athlete mode: renders editable hero, live chip machinery, and tabs', () => {
  pacesMode = 'athlete';
  renderPaces();
  const el = document.getElementById('pc-body').innerHTML;
  assert(/id="pcRep" class="hero-edit"/.test(el), 'hero rep select missing');
  assert(/heroTimeEdit\\(\\)/.test(el), 'hero time click-to-edit missing');
  assert(/pacesModeTabs|pc-tab/.test(el), 'mode tabs missing');
  assert(!/onclick="calcPaces\\(\\)">Recalculate/.test(html_src), 'vestigial Recalculate button resurfaced');
});
probe('quick-paces cross-link is a real button (keyboard-reachable)', () => {
  pacesMode = 'athlete';
  renderPaces();
  const el = document.getElementById('pc-body').innerHTML;
  assert(/<button type="button" onclick="setPacesMode\\('quick'\\)"/.test(el), 'quick-paces link is not a button');
});

// ── 4. Mile gate follows the EFFECTIVE anchor, not the raw PR ──────────────
probe('fitness override: 5K override on an 800m-PR athlete unlocks the mile view', () => {
  const sprinter = mk({name:'Ana Bolt',primaryEvent:'800m',raceDistance:'800m',raceDistanceM:800,raceTime:'2:10.00'});
  DB.athletes.push(sprinter); A = sprinter;
  pacesMode = 'athlete';
  localStorage.setItem('strideFitnessOverrides', JSON.stringify({ ['c1:' + sprinter.id]: { event:'5K', time:'19:00', setOn:'2026-08-18' } }));
  renderPaces();
  // The stub DOM doesn't parse innerHTML, so feed the controls their values
  // the way the browser's initial render would, then recalc.
  document.getElementById('pcPct').value = '100';
  document.getElementById('pcRep').value = '800';
  updateBuilder({ noFlash: true });
  const mile = document.getElementById('build-mile').textContent;
  assert(mile !== '—' && /\\d/.test(mile), 'mile view stayed gated despite a 1500m+ effective anchor, got: ' + mile);
  localStorage.removeItem('strideFitnessOverrides');
});
`;
ctx.html_src = main;
try { vm.runInContext(probeSrc, ctx, { filename: 'pace-ui-probes' }); } catch (e) { console.log('PROBE HARNESS ERROR:', e.message); process.exitCode = 1; }

let fails = 0;
for (const [st, label, msg] of ctx.__res) {
  console.log(st, ' ', label, msg ? '\n      ' + msg : '');
  if (st.trim() === 'FAIL') fails++;
}
if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log(`\npace ui probes ok — ${ctx.__res.length} probes`);
