// ══════════════════════════════════════════════════════════════════════════
// RETENTION FLOW PROBES (2026-08-18)
// ══════════════════════════════════════════════════════════════════════════
// The pause/freeze/cancel flow is doctrine-bearing UI: cancellation must be
// easy and honest, hesitation (dwell >= 10s) earns exactly ONE extra save
// screen, and the $1.99 freeze must carry the "why it costs money" honesty
// copy including the free-export escape hatch. These probes RUN the real
// renderers in a Node VM (same harness as screen-render-probes.mjs) so the
// promises above are proven, not assumed.
//
// Run: node tests/retention-flow-probes.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const main = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).sort((a, b) => b.length - a.length)[0];

const mkClassList = () => { const set = new Set(); return {
  add(c){set.add(c)}, remove(c){set.delete(c)}, contains(c){return set.has(c)},
  toggle(c, force){ const on = force === undefined ? !set.has(c) : Boolean(force);
    if(on) set.add(c); else set.delete(c); return on; } }; };
const mkEl = () => ({ innerHTML:'', textContent:'', style:{}, classList:mkClassList(),
  setAttribute(){}, removeAttribute(){}, getAttribute(){return null}, appendChild(){}, addEventListener(){},
  querySelectorAll(){return []}, querySelector(){return null}, scrollIntoView(){}, focus(){}, value:'', checked:false, dataset:{},
  parentNode:null, removeChild(){} });
const store = {};
const doc = { getElementById:(id)=>store[id]||(store[id]=mkEl()), querySelectorAll:()=>[], querySelector:()=>null,
  createElement:()=>mkEl(), addEventListener(){}, body:Object.assign(mkEl(),{appendChild(){}}), documentElement:mkEl(), head:mkEl(), title:'', readyState:'complete' };
const ls = {_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}};
const win = { addEventListener(){}, matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
  location:{hash:'',search:'',pathname:'/',href:'http://localhost/'}, history:{replaceState(){},pushState(){}},
  localStorage:ls, sessionStorage:ls, scrollTo(){}, navigator:{userAgent:'node',clipboard:{writeText:async()=>{}}},
  print(){}, open(){return null}, requestAnimationFrame:(f)=>setTimeout(f,0) };
const ctx = { document:doc, window:win, localStorage:ls, sessionStorage:ls, navigator:win.navigator, location:win.location,
  history:win.history, console, setTimeout, clearTimeout, setInterval:()=>0, clearInterval(){},
  fetch:async()=>({ok:false,json:async()=>({}),text:async()=>''}), alert(){}, confirm:()=>true, prompt:()=>null,
  requestAnimationFrame:win.requestAnimationFrame, matchMedia:win.matchMedia, URLSearchParams, Date, __store:store };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
try { vm.runInContext(main, ctx, { filename: 'index.html' }); } catch (e) { console.log('LOAD ERROR:', e.message); }

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
};
const run = (src) => vm.runInContext(src, ctx, { filename: 'probe' });

console.log('\n— dwell-time decision (the GHL idea) —');
ok(run(`retentionDecideAfterOffers(3000, false)`) === 'confirm',
  'fast click (<10s) skips the last-chance screen — a made-up mind gets out');
ok(run(`retentionDecideAfterOffers(15000, false)`) === 'lastchance',
  'hesitation (>=10s) earns the one last-chance screen');
ok(run(`retentionDecideAfterOffers(15000, true)`) === 'confirm',
  'last-chance shows at most ONCE, even for a slow second pass');
ok(run(`RETENTION_DWELL_MS`) === 10000, 'dwell threshold is the agreed 10s starting point');

console.log('\n— retentionCancelClicked() wiring —');
run(`
  retentionFlow = { step:'offers', reason:'price', status:null, statusError:null,
    offersShownAt: Date.now() - 20000, lastChanceShown:false, busy:false, done:null, freezeWhyOpen:false };
  retentionCancelClicked();
`);
ok(run(`retentionFlow.step`) === 'lastchance', 'slow canceller is routed to lastchance');
ok(run(`retentionFlow.lastChanceShown`) === true, 'lastChanceShown latches so it can never repeat');
run(`
  retentionFlow = { step:'offers', reason:'price', status:null, statusError:null,
    offersShownAt: Date.now() - 1500, lastChanceShown:false, busy:false, done:null, freezeWhyOpen:false };
  retentionCancelClicked();
`);
ok(run(`retentionFlow.step`) === 'confirm', 'fast canceller goes straight to confirm');

console.log('\n— offers screen honesty —');
const offersHtml = run(`
  retentionFlow = { step:'offers', reason:'price',
    status:{ state:'active', pause_available:true, current_period_end: 1789500000, paused_until:null },
    statusError:null, offersShownAt:null, lastChanceShown:false, busy:false, done:null, freezeWhyOpen:true };
  renderRetentionFlow();
  __store['retentionOverlay'].innerHTML;
`);
ok(offersHtml.includes('Pause for a month'), 'free month pause offered when available');
ok(offersHtml.includes('$1.99/mo'), 'freeze price stated plainly');
ok(offersHtml.includes('Why does freezing cost $1.99?'), 'the "why it costs money" transparency link exists');
ok(offersHtml.includes('$1.60'), 'explainer admits what survives card fees');
ok(offersHtml.includes('cancel') && offersHtml.includes('free — no hard feelings'),
  'explainer offers the free export-and-cancel escape hatch');
ok(offersHtml.includes('I just want to cancel'), 'a direct cancel path is on the FIRST offers screen — no hoops');
ok(offersHtml.includes('keep my plan'), 'keep-my-plan exit is present');

const offersNoPause = run(`
  retentionFlow.freezeWhyOpen = false;
  retentionFlow.status = { state:'active', pause_available:false, pause_blocked_reason:'pause is for monthly plans', current_period_end: 1789500000 };
  renderRetentionFlow();
  __store['retentionOverlay'].innerHTML;
`);
ok(!offersNoPause.includes('Pause for a month'), 'pause card hidden when the backend says pause is unavailable');
ok(!offersNoPause.includes('$1.60'), 'why-explainer stays collapsed until asked');

console.log('\n— freeze unavailable (backend not configured) —');
const offersFreezeOff = run(`
  retentionFlow = { step:'offers', reason:'price',
    status:{ state:'active', pause_available:false, freeze_available:false, current_period_end: 1789500000 },
    statusError:null, offersShownAt:null, lastChanceShown:false, busy:false, done:null, freezeWhyOpen:false };
  renderRetentionFlow();
  __store['retentionOverlay'].innerHTML;
`);
ok(!offersFreezeOff.includes('Freeze my account'), 'freeze card hidden when backend says unavailable');
ok(offersFreezeOff.includes('I just want to cancel'), 'cancel path still present without offers');
run(`
  retentionFlow.offersShownAt = Date.now() - 60000;
  retentionCancelClicked();
`);
ok(run(`retentionFlow.step`) === 'confirm',
  'no last-chance freeze pitch when freeze is unavailable — even a slow canceller goes straight to confirm');

console.log('\n— confirm screen honesty —');
const confirmHtml = run(`
  retentionFlow.step = 'confirm';
  renderRetentionFlow();
  __store['retentionOverlay'].innerHTML;
`);
ok(confirmHtml.includes('Nothing is deleted'), 'confirm screen promises data is hidden, not erased (repair-not-delete doctrine)');
ok(confirmHtml.includes('exportMyData'), 'confirm screen offers a free full export');
ok(confirmHtml.includes('2026'), 'confirm screen names the real period-end date');
ok(confirmHtml.includes('Cancel my subscription'), 'the actual cancel button exists');
ok(confirmHtml.includes('keep my plan'), 'never-mind exit still present at the end');

console.log('\n— frozen account surfaces —');
const frozenCard = run(`
  hasSupabaseConfig = () => true;
  sbClient = {}; sbBackendReachable = true;
  sbUser = { email: 'coach@example.com' };
  sbSubscription = { tier:'free', status:'frozen', hasProAccess:false, trialSecondsRemaining:null, interval:null };
  authStatusHtml();
`);
ok(frozenCard.includes('FROZEN'), 'auth card shows the FROZEN badge');
ok(frozenCard.includes('unfreezeSubscription'), 'auth card offers Unfreeze, not a generic upgrade pitch');
ok(frozenCard.includes('$1.99/mo'), 'auth card restates the honest holding price');

const proCard = run(`
  sbSubscription = { tier:'pro', status:'active', hasProAccess:true, trialSecondsRemaining:null, interval:'monthly' };
  authStatusHtml();
`);
ok(proCard.includes('showRetentionFlow'), 'Pro card links the retention flow — cancellation is easy to FIND');
ok(proCard.includes('Pause, freeze or cancel'), 'the link says what it is, no euphemism');

const frozenBanner = run(`
  DB = DB || { athletes: [] };
  sbSubscription = { tier:'free', status:'frozen', hasProAccess:false, trialSecondsRemaining:null };
  renderTierBanner();
  __store['tierBanner'].innerHTML;
`);
ok(frozenBanner.includes('Account frozen'), 'tier banner has a dedicated frozen state');
ok(frozenBanner.includes('Unfreeze'), 'frozen banner CTA is Unfreeze');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
