// ══════════════════════════════════════════════════════════════════════════
// LANDING PROBES (2026-08-04)
// ══════════════════════════════════════════════════════════════════════════
// Covers the two regressions the 2026-08-04 peer review caught in the landing
// redesign, both of which the existing suites were blind to:
//
//   ① The modelled-range label was built as `min(PR) – target`, which INVERTS
//      whenever the never-raced target is shorter than every logged mark. The
//      Marathoner (10K / Half / Marathon, target 5K) rendered "10K – 5K". The
//      accompanying copy also called that span "the range this athlete's own
//      marks support" — but the target sits outside the logged marks in every
//      archetype, so it is an extrapolation and must be described as one.
//
//   ② applyLandingMode() claimed to tear the motion layer down when leaving
//      the front door, but only hid the overlays: the pointer-light rAF loop
//      ran forever and its pointermove listener stayed bound, so the coach
//      workspace kept paying for the landing page on every frame.
//
// Like screen-render-probes, this RUNS the app's main <script> in a VM — a
// static regex could not have caught either bug. The window stub here counts
// listener add/remove and rAF schedule/cancel so teardown is observable.
//
// Run: node tests/landing-probes.mjs
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
  toggle(c,force){ const on = force===undefined ? !set.has(c) : Boolean(force);
    if(on) set.add(c); else set.delete(c); return on; } }; };
const mkEl = () => ({ innerHTML:'', textContent:'', style:{setProperty(){},getPropertyValue(){return ''}},
  classList:mkClassList(), setAttribute(){}, removeAttribute(){}, getAttribute(){return null},
  appendChild(){}, addEventListener(){}, removeEventListener(){},
  querySelectorAll(){return []},
  querySelector(sel){ this._kids = this._kids || {}; return this._kids[sel] || (this._kids[sel] = mkEl()); },
  scrollIntoView(){}, focus(){},
  getBoundingClientRect(){return {top:0,left:0,width:0,height:0,bottom:0,right:0}},
  // initLandingEngine() guards its one-time grid draw on grid.childNodes.length.
  childNodes:[],
  offsetTop:0, offsetHeight:0, offsetParent:null, value:'', checked:false, dataset:{} });

const store = {};
const doc = { getElementById:(id)=>store[id]||(store[id]=mkEl()), querySelectorAll:()=>[],
  querySelector:()=>null, createElement:()=>mkEl(), addEventListener(){}, removeEventListener(){},
  body:mkEl(), documentElement:mkEl(), head:mkEl(), title:'', readyState:'complete' };
const ls = {_d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]}};

// Observable counters — the whole point of this harness.
const fx = { listeners:new Map(), rafLive:new Set(), rafNext:1 };
const win = {
  addEventListener(type, fn){ fx.listeners.set(type, (fx.listeners.get(type)||new Set()).add(fn)); },
  removeEventListener(type, fn){ const s = fx.listeners.get(type); if(s) s.delete(fn); },
  // Never actually invokes the callback: the pointer loop is self-rescheduling,
  // so running it here would spin forever. We only track schedule vs cancel.
  requestAnimationFrame(){ const id = fx.rafNext++; fx.rafLive.add(id); return id; },
  cancelAnimationFrame(id){ fx.rafLive.delete(id); },
  matchMedia:()=>({ matches:false, addEventListener(){}, addListener(){} }),
  location:{hash:'',search:'',pathname:'/',href:'http://localhost/'},
  history:{replaceState(){},pushState(){}}, localStorage:ls, sessionStorage:ls,
  scrollTo(){}, navigator:{userAgent:'node',clipboard:{writeText:async()=>{}}},
  print(){}, open(){return null}, innerWidth:1440, innerHeight:900, scrollY:0, devicePixelRatio:1,
  IntersectionObserver: class { observe(){} unobserve(){} disconnect(){} },
};
win.window = win;

const ctx = { document:doc, window:win, localStorage:ls, sessionStorage:ls, navigator:win.navigator,
  location:win.location, history:win.history, console, setTimeout, clearTimeout,
  setInterval:()=>0, clearInterval(){}, requestAnimationFrame:win.requestAnimationFrame,
  cancelAnimationFrame:win.cancelAnimationFrame, IntersectionObserver:win.IntersectionObserver,
  innerWidth:1440, innerHeight:900, scrollY:0,
  performance:{now:()=>0}, btoa:(s)=>Buffer.from(s,'binary').toString('base64'),
  fetch:async()=>({ok:true,json:async()=>({})}), matchMedia:win.matchMedia };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(main, ctx, { filename:'index.html:main' });

// top-level `const`/`let` in the script are NOT context properties — evaluate
// the identifier inside the VM to reach them.
const inVm = (expr) => vm.runInContext(expr, ctx);
const ARCHETYPES = inVm('ARCHETYPES');
const curveSet = () => inVm('curveSet()');
const distLabel = (d) => inVm(`distLabel(${d})`);

let failed = 0, ran = 0;
function probe(name, fn){
  ran++;
  try { fn(); console.log('  ok   ' + name); }
  catch(e){ failed++; console.error('  FAIL ' + name + '\n       ' + e.message); }
}
const assert = (cond, msg) => { if(!cond) throw new Error(msg); };

console.log('landing probes');

// ── ① modelled-range label ────────────────────────────────────────────────
const DIST = { '100m':100,'200m':200,'400m':400,'800m':800,'1500m':1500,'1600m':1600,
  'Mile':1609.34,'3000m':3000,'3200m':3200,'5K':5000,'8K':8000,'10K':10000,
  'Half Marathon':21097.5,'Marathon':42195 };

probe('every archetype range label reads low → high', () => {
  const set = curveSet();
  assert(set.length === ARCHETYPES.length, `expected ${ARCHETYPES.length} curves, got ${set.length}`);
  set.forEach((c, i) => {
    const a = ARCHETYPES[i];
    const ds = Object.keys(a.prs).map(k => DIST[k]).concat(DIST[a.whatIf]);
    const lo = Math.min(...ds), hi = Math.max(...ds);
    const want = `${distLabel(lo)} – ${distLabel(hi)}`;
    assert(c.range === want, `${a.name}: range "${c.range}" should be "${want}"`);
  });
});

probe('the Marathoner (target SHORTER than every PR) is not inverted', () => {
  // The exact regression: 10K / Half / Marathon with a 5K target used to
  // render "10K – 5K" because the label paired min(PR) with the target.
  const i = ARCHETYPES.findIndex(a => a.key === 'mar');
  assert(i >= 0, 'the marathoner archetype disappeared — update this probe');
  const a = ARCHETYPES[i], c = curveSet()[i];
  assert(DIST[a.whatIf] < Math.min(...Object.keys(a.prs).map(k => DIST[k])),
    'fixture no longer exercises a downward extrapolation — this probe is now vacuous');
  assert(c.range === '5K – Mar', `expected "5K – Mar", got "${c.range}"`);
  assert(c.extrapolated === 'below', `expected extrapolated "below", got "${c.extrapolated}"`);
});

probe('a never-raced target is described as an extrapolation, not as supported', () => {
  curveSet().forEach((c, i) => {
    const a = ARCHETYPES[i];
    assert(c.extrapolated === 'below' || c.extrapolated === 'beyond',
      `${a.name}: target sits inside the logged marks — copy assumption changed`);
    assert(/extrapolation/.test(c.rangeNote), `${a.name}: note does not name the extrapolation`);
    assert(!/marks support/.test(c.rangeNote), `${a.name}: note still claims the marks support the target`);
    assert(c.rangeNote.includes('{range}') && c.rangeNote.includes('{logged}'),
      `${a.name}: note lost a substitution slot`);
    assert(c.logged && c.logged !== c.range, `${a.name}: logged span should differ from the modelled span`);
  });
});

// ── ② motion teardown / re-entry ──────────────────────────────────────────
const pointerCount = () => (fx.listeners.get('pointermove') || new Set()).size;
const scrollCount = () => (fx.listeners.get('scroll') || new Set()).size;

// These drive the REAL route path — renderHome() to start, applyLandingMode()
// to leave. An earlier version called teardownLandingMotion() directly and was
// vacuous: it still passed with the fix reverted, because the bug was never in
// that function, it was that applyLandingMode() never called it.
const enterLanding = () => { inVm("currentScreen='home'"); inVm('renderHome()'); };
const leaveLanding = () => { inVm("currentScreen='paces'"); inVm('applyLandingMode()'); };

probe('arriving on the front door binds a pointer loop and scroll listeners', () => {
  enterLanding();
  assert(pointerCount() === 1, `expected 1 pointermove listener, got ${pointerCount()}`);
  assert(scrollCount() === 1, `expected 1 scroll listener, got ${scrollCount()}`);
  assert(fx.rafLive.size > 0, 'no animation frame was scheduled');
});

probe('routing AWAY from the front door cancels the frame and unbinds the listeners', () => {
  leaveLanding();
  assert(pointerCount() === 0, `pointermove listener survived the route change (${pointerCount()})`);
  assert(scrollCount() === 0, `scroll listener survived the route change (${scrollCount()})`);
  assert(fx.rafLive.size === 0, `${fx.rafLive.size} animation frame(s) still live in the workspace`);
});

probe('returning to the front door restarts motion exactly once', () => {
  enterLanding();
  assert(pointerCount() === 1, `expected 1 pointermove listener on re-entry, got ${pointerCount()}`);
  assert(scrollCount() === 1, `expected 1 scroll listener on re-entry, got ${scrollCount()}`);
  assert(fx.rafLive.size > 0, 'no animation frame scheduled on re-entry');
});

probe('re-rendering the front door does not stack duplicate listeners or loops', () => {
  const before = fx.rafLive.size;
  enterLanding(); enterLanding();
  assert(pointerCount() === 1, `pointermove listeners stacked to ${pointerCount()}`);
  assert(scrollCount() === 1, `scroll listeners stacked to ${scrollCount()}`);
  assert(fx.rafLive.size <= before + 1, `animation frames stacked to ${fx.rafLive.size}`);
});

probe('leaving twice in a row is harmless', () => {
  leaveLanding(); leaveLanding();
  assert(pointerCount() === 0, 'listener resurrected by a second route change');
  assert(fx.rafLive.size === 0, 'frame resurrected by a second route change');
});

console.log(`\n${ran - failed}/${ran} landing probes passed`);
if(failed) process.exit(1);
