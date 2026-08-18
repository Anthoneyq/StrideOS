// ══════════════════════════════════════════════════════════════════════════
// CONDITIONS PROBES (2026-08-17)
// ══════════════════════════════════════════════════════════════════════════
// Kyle's call items: humidity in the condition adjustment (60°F/90%RH runs
// harder than the thermometer says), the indoor-race toggle (a January
// indoor PR must not get a 20°F outdoor correction), and the Chrome
// number-input scroll bug (wheel over a focused number input silently
// changed the typed temperature).
// Run: node tests/conditions-probes.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const main = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).sort((a, b) => b.length - a.length)[0];

const listeners = [];
const mkEl = () => ({ innerHTML: '', textContent: '', style: {}, checked: false, value: '',
  classList: { add(){}, remove(){}, contains(){ return false; }, toggle(){ return false; } },
  setAttribute(){}, removeAttribute(){}, getAttribute(){ return null; }, appendChild(){}, addEventListener(){},
  querySelectorAll(){ return []; }, querySelector(){ return null; }, scrollIntoView(){}, focus(){}, dataset: {} });
const store = {};
const doc = { getElementById: (id) => store[id] || (store[id] = mkEl()), querySelectorAll: () => [], querySelector: () => null,
  createElement: () => mkEl(), addEventListener(ev, fn, opts){ listeners.push({ ev, fn, opts }); }, body: mkEl(), documentElement: mkEl(), head: mkEl(), title: '', readyState: 'complete' };
const ls = { _d: {}, getItem(k){ return this._d[k] ?? null; }, setItem(k, v){ this._d[k] = String(v); }, removeItem(k){ delete this._d[k]; } };
const win = { addEventListener(){}, matchMedia: () => ({ matches: false, addEventListener(){}, addListener(){} }),
  location: { hash: '', search: '', pathname: '/', href: 'http://localhost/' }, history: { replaceState(){}, pushState(){} },
  localStorage: ls, sessionStorage: ls, scrollTo(){}, navigator: { userAgent: 'node', clipboard: { writeText: async () => {} } },
  print(){}, open(){ return null; }, requestAnimationFrame: (f) => setTimeout(f, 0) };
const ctx = { document: doc, window: win, localStorage: ls, sessionStorage: ls, navigator: win.navigator, location: win.location,
  history: win.history, console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval(){},
  fetch: async () => ({ ok: false, json: async () => ({}) }), alert(){}, confirm: () => true, prompt: () => null,
  requestAnimationFrame: win.requestAnimationFrame, matchMedia: win.matchMedia, URLSearchParams, __store: store, __listeners: listeners, __res: [] };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
try { vm.runInContext(main, ctx, { filename: 'index.html' }); } catch (e) { console.log('LOAD ERROR:', e.message); }

const probeSrc = `
const probe=(label,fn)=>{ try{ fn(); __res.push(['OK   ',label,'']); }catch(e){ __res.push(['FAIL ',label,(e&&e.message)||String(e)]); } };

// ── HUMIDITY MODEL ──
probe('humidity: no effect at/below 40% RH or below 65°F', ()=>{
  if(effectiveTempF(85, 40) !== 85) throw new Error('40% RH should be free');
  if(effectiveTempF(60, 100) !== 60) throw new Error('cool air: humidity free');
  if(effectiveTempF(85, null) !== 85) throw new Error('missing RH must be neutral');
});
probe('humidity: 85°F at 90% RH corrects like substantially hotter air', ()=>{
  const eff = effectiveTempF(85, 90);
  if(!(eff > 95 && eff <= 110)) throw new Error('heat index off: '+eff);
  const withHum = environmentalCorrection(85, 0, 90);
  const without = environmentalCorrection(85, 0, null);
  if(!(withHum > without)) throw new Error('humidity did not increase correction');
});
probe('humidity: 65–80°F blend is small, positive, and continuous-ish', ()=>{
  const eff = effectiveTempF(72, 95);
  if(!(eff > 72 && eff < 78)) throw new Error('blend out of range: '+eff);
  if(effectiveTempF(79.9, 100) > effectiveTempF(80.1, 100)) throw new Error('discontinuity at 80°F boundary');
});
probe('humidity: absurd input cannot explode the correction', ()=>{
  const eff = effectiveTempF(120, 100);
  if(eff > 145) throw new Error('cap failed: '+eff);
  if(environmentalCorrection(120, 0, 100) > 0.25) throw new Error('factor beyond physiological range');
});
probe('humidity: applyEnvironment threads the third arg', ()=>{
  const dry = applyEnvironment(300, 85, 0, null);
  const wet = applyEnvironment(300, 85, 0, 90);
  if(!(wet > dry)) throw new Error('humid target not slower');
});
probe('humidity: getEnvSettings exposes humidityPct from the envHum input', ()=>{
  document.getElementById('envTemp').value = '85'; document.getElementById('envHum').value = '90'; document.getElementById('envAlt').value = '';
  const env = getEnvSettings();
  if(env.humidityPct !== 90 || env.tempF !== 85) throw new Error(JSON.stringify(env));
  document.getElementById('envTemp').value = ''; document.getElementById('envHum').value = '';
});

probe('humidity: fetched race conditions land in envHum and clear with them', ()=>{
  document.getElementById('envHum').value = '';
  applyFetchedConditions({ tempF: 88, altitudeFt: 600, humidity: 87.4 });
  if(document.getElementById('envHum').value != 87) throw new Error('fetched humidity not applied: "'+document.getElementById('envHum').value+'"');
  if(document.getElementById('envTemp').value != 88) throw new Error('temp not applied');
  A = { id:'w1', name:'Jo', raceWeather:{ success:true } }; DB = { athletes: [] }; saveDB = () => {};
  clearCachedWeather();
  if(document.getElementById('envHum').value !== '') throw new Error('humidity survived clear');
  if(document.getElementById('envTemp').value !== '') throw new Error('temp survived clear');
});

// ── INDOOR TOGGLE ──
probe('indoor: cloud row round-trips the flag inside race_weather', ()=>{
  const local = remoteAthleteToLocal({ id:'u1', client_ref:'a1', display_name:'Jo', race_weather:{ indoor:true },
    race_distance:'1600m', race_distance_m:1600, race_time:'5:20.00', race_date:'2026-01-15' }, []);
  if(local.indoorRace !== true) throw new Error('indoor flag lost on load');
  const outdoor = remoteAthleteToLocal({ id:'u2', client_ref:'a2', display_name:'Ry', race_weather:{ success:true, tempF:75 } }, []);
  if(outdoor.indoorRace !== false) throw new Error('outdoor athlete misflagged indoor');
});
probe('indoor: autoFillConditions refuses to fetch outdoor weather', ()=>{
  // The indoor guard sits before the first await, so its effect is visible
  // synchronously — an async probe here would report OK before asserting.
  A = { id:'x', name:'Jo', indoorRace:true, raceLocation:'Ames, IA', raceDate:'2026-01-15' };
  document.getElementById('weatherStatus').innerHTML = '';
  autoFillConditions();
  if(!/[Ii]ndoor/.test(__store['weatherStatus'].innerHTML)) throw new Error('no indoor notice');
  if(/Looking up/.test(__store['weatherStatus'].innerHTML)) throw new Error('lookup ran for an indoor race');
});

// ── CHROME NUMBER-INPUT SCROLL BUG ──
probe('scroll fix: a wheel event blurs a focused number input (passive)', ()=>{
  const reg = __listeners.find(l => l.ev === 'wheel');
  if(!reg) throw new Error('no wheel listener registered');
  if(!(reg.opts && reg.opts.passive)) throw new Error('wheel listener must be passive');
  let blurred = false;
  document.activeElement = { tagName:'INPUT', type:'number', blur(){ blurred = true; } };
  reg.fn({});
  if(!blurred) throw new Error('focused number input not blurred on wheel');
  blurred = false;
  document.activeElement = { tagName:'INPUT', type:'text', blur(){ blurred = true; } };
  reg.fn({});
  if(blurred) throw new Error('text input wrongly blurred');
});

// ── CONDITION-ADJUSTMENT CONFIDENCE (Alex 2026-08-17) ──
probe('confidence: null when no conditions entered', ()=>{
  if(conditionConfidence({ tempF:null, altitudeFt:null, humidityPct:null }) !== null)
    throw new Error('empty env must not print a confidence number');
});
probe('confidence: caps at 95 — tables never know the individual athlete', ()=>{
  const c = conditionConfidence({ tempF:70, altitudeFt:null, humidityPct:null });
  if(c.pct > 95) throw new Error('confidence above 95: ' + c.pct);
});
probe('confidence: extreme heat drops it with a named reason', ()=>{
  const mild = conditionConfidence({ tempF:75, altitudeFt:null, humidityPct:null });
  const extreme = conditionConfidence({ tempF:98, altitudeFt:null, humidityPct:90 });
  if(!(extreme.pct < mild.pct)) throw new Error('extreme heat should be less confident than mild');
  if(!extreme.notes.length) throw new Error('a deduction must carry a reason');
});
probe('confidence: stacked heat + altitude less confident than either alone', ()=>{
  const heat = conditionConfidence({ tempF:85, altitudeFt:null, humidityPct:null });
  const alt = conditionConfidence({ tempF:null, altitudeFt:5000, humidityPct:null });
  const both = conditionConfidence({ tempF:85, altitudeFt:5000, humidityPct:null });
  if(!(both.pct < heat.pct && both.pct < alt.pct)) throw new Error('stacking must cost confidence');
});
probe('confidence: floors at 40 — never pretends total ignorance is precision', ()=>{
  const worst = conditionConfidence({ tempF:110, altitudeFt:12000, humidityPct:100 });
  if(worst.pct < 40) throw new Error('floor breached: ' + worst.pct);
});
probe('confidence: humidity blend zone (65–80°F) is marked interpolated', ()=>{
  const c = conditionConfidence({ tempF:72, altitudeFt:null, humidityPct:90 });
  if(!c.notes.some(n => /interpolated/.test(n))) throw new Error('blend-zone note missing');
});
`;

try { await vm.runInContext(`(async()=>{${probeSrc}})()`, ctx, { filename: 'conditions-probes' }); }
catch (e) { console.log('PROBE ERROR:', e.stack || e.message); process.exit(1); }

let fail = 0;
for (const [st, label, msg] of ctx.__res) {
  console.log(st, label, msg);
  if (st.trim() === 'FAIL') fail++;
}
if (fail) { console.log(`\n${fail} FAILING`); process.exit(1); }
console.log(`\nconditions probes ok — ${ctx.__res.length} probes`);
