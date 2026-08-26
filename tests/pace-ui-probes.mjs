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
  assert(/class="pc-mode-tabs"/.test(el), 'compact mode tab layout missing');
  assert(!/Quick paces · any time, no athlete/.test(el), 'long quick-mode label resurfaced');
  assert(!/onclick="calcPaces\\(\\)">Recalculate/.test(html_src), 'vestigial Recalculate button resurfaced');
});
probe('mobile pace UI: compact hierarchy and selected-rep table rules exist', () => {
  assert(full_html.includes('#paces .screen-title{font-size:1.25rem'), 'mobile pace title is not compact');
  assert(full_html.includes('.pc-table-scroll .pc-rep-col:not(.is-selected){display:none}'), 'mobile table does not hide non-selected reps');
  const table = buildDanielsTable();
  assert(/pc-rep-col is-selected/.test(table), 'selected rep column is not identified');
  assert(/pc-mobile-table-note/.test(table), 'phone table guidance missing');
});
probe('quick mode: target precedes optional hill conversion', () => {
  const calc = renderFreeTierCalculator({ quick:true });
  const targetAt = calc.indexOf('id="ft-result"');
  const hillsAt = calc.indexOf('class="pc-grade-details"');
  assert(targetAt >= 0 && hillsAt > targetAt, 'hill tool still blocks the primary target');
  assert(/<details class="pc-grade-details">/.test(calc), 'hill tool is not optional disclosure');
});
probe('current fitness: every canonical race event is available', () => {
  assert(JSON.stringify(FITNESS_OVERRIDE_EVENTS) === JSON.stringify(Object.keys(DIST)), 'current-fitness event list drifted from DIST');
  const card = fitnessOverrideCard(A);
  Object.keys(DIST).forEach(event => assert(card.includes('>' + event + '</option>'), 'missing current-fitness event ' + event));
});
probe('100m athlete: hero starts on a valid 100m race-pace target', () => {
  const sprinter = mk({name:'Sam Swift',primaryEvent:'100m',raceDistance:'100m',raceDistanceM:100,raceTime:'11.50'});
  DB.athletes.push(sprinter); A = sprinter;
  pacesMode = 'athlete';
  renderPaces();
  const el = document.getElementById('pc-body').innerHTML;
  assert(el.includes('<option value="100" selected>100m</option>'), '100m rep was not selected');
  document.getElementById('pcPct').value = '100';
  document.getElementById('pcRep').value = '100';
  updateBuilder({ noFlash: true });
  assert(document.getElementById('build-100').textContent === '11.5s', '100m split did not calculate');
  assert(document.getElementById('build-offset').textContent === '= race pace', '100m target remained blocked');
});
probe('quick paces: race selector contains every canonical event', () => {
  const calc = renderFreeTierCalculator({ quick:true });
  Object.entries(DIST).forEach(([event, meters]) => assert(calc.includes('value="' + meters + '"') && calc.includes('>' + event + '</option>'), 'missing quick event ' + event));
});
probe('short anchors: invalid universal 800m default clamps to the race distance', () => {
  assert(defaultRepForAnchor(100) === 100, '100m default');
  assert(defaultRepForAnchor(200) === 200, '200m default');
  assert(defaultRepForAnchor(400) === 400, '400m default');
  assert(defaultRepForAnchor(800) === 800, '800m default');
  assert(defaultRepForAnchor(1600) === 800, 'distance default');
});
probe('quick-paces cross-link is a real button (keyboard-reachable)', () => {
  pacesMode = 'athlete';
  renderPaces();
  const el = document.getElementById('pc-body').innerHTML;
  assert(/<button type="button" onclick="setPacesMode\\('quick'\\)"/.test(el), 'quick-paces link is not a button');
});

// ── 2b. Quick paces column highlight follows ftRep, not the absent pcRep ───
probe('quick paces: highlighted column follows the ftRep selection', () => {
  document.getElementById('pcRep').value = '';       // athlete-mode select absent in quick mode
  document.getElementById('ftRep').value = '400';
  const t = buildDanielsTable(quickAnchor());
  assert(/background:var\\(--bg-el\\);[^>]*>400m</.test(t), '400m column not highlighted');
  assert(!/background:var\\(--bg-el\\);[^>]*>800m</.test(t), '800m column wrongly highlighted');
  document.getElementById('ftRep').value = '200';
  const t2 = buildDanielsTable(quickAnchor());
  assert(/background:var\\(--bg-el\\);[^>]*>200m</.test(t2), 'highlight did not follow ftRep to 200m');
  document.getElementById('ftRep').value = '';
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
  // The LADDER must follow the same effective anchor: with the override
  // active no zone row may be blocked; with it cleared, aerobic rows are.
  const unlocked = buildLadderRows();
  assert(!/data-allowed="0"/.test(unlocked), 'ladder rows still blocked despite a 1500m+ effective anchor');
  localStorage.removeItem('strideFitnessOverrides');
  const relocked = buildLadderRows();
  assert(/data-allowed="0"/.test(relocked), 'aerobic ladder rows should re-block on a raw 800m anchor');
});
// ── 5. Hills & treadmill: wind, belt calibration, lane geometry ────────────
// (2026-08-26) These drive updateRoadGradeTool through the real DOM path
// rather than the pure functions, because the failure modes here are all in
// the wiring: a field shown on the wrong surface, a belt number that is true
// speed where the coach expects a console number, or a condition read from an
// input that does not exist.
const gradeUI = (inputs) => {
  const set = (id, v) => { document.getElementById('probeGrade' + id).value = v; };
  ['Surface','Mode','Pace','Grade','Rep','RepUnit','Wind','Cal'].forEach(k => set(k, ''));
  set('Surface', 'outdoor'); set('Mode', 'target'); set('RepUnit', 'sec');
  Object.keys(inputs).forEach(k => set(k, inputs[k]));
  updateRoadGradeTool('probeGrade');
  return {
    result: document.getElementById('probeGradeResult').innerHTML,
    detail: document.getElementById('probeGradeDetail').innerHTML,
    windShown: document.getElementById('probeGradeWindField').style.display !== 'none',
    calShown: document.getElementById('probeGradeCalField').style.display !== 'none'
  };
};
const mphIn = (s) => { const m = s.match(/([\\d.]+)\\s*mph/); return m ? Number(m[1]) : null; };
const paceIn = (s) => { const m = s.match(/(\\d+):(\\d\\d)\\/mi/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

probe('grade tool: each surface shows only the condition it can have', () => {
  const road = gradeUI({ Pace: '8:00', Grade: '5' });
  assert(road.windShown && !road.calShown, 'road should offer wind, not belt calibration');
  const belt = gradeUI({ Surface: 'belt', Pace: '8:00', Grade: '5' });
  assert(belt.calShown && !belt.windShown, 'belt should offer calibration, not wind');
});

probe('grade tool: a headwind slows the prescribed pace, a tailwind quickens it', () => {
  const calm = paceIn(gradeUI({ Pace: '8:00', Grade: '0' }).result);
  const head = paceIn(gradeUI({ Pace: '8:00', Grade: '0', Wind: '15' }).result);
  const tail = paceIn(gradeUI({ Pace: '8:00', Grade: '0', Wind: '-15' }).result);
  assert(calm && head && tail, 'all three should produce a pace');
  assert(head > calm, 'headwind should slow the target (calm ' + calm + 's, head ' + head + 's)');
  assert(tail < calm, 'tailwind should quicken it (calm ' + calm + 's, tail ' + tail + 's)');
});

probe('grade tool: wind is named in the answer, so it is never applied silently', () => {
  const r = gradeUI({ Pace: '8:00', Grade: '3', Wind: '12' }).result;
  assert(/12 mph headwind/.test(r), 'headwind should be stated on the result, got: ' + r);
  const t = gradeUI({ Pace: '8:00', Grade: '3', Wind: '-12' }).result;
  assert(/12 mph tailwind/.test(t), 'tailwind should be named as a tailwind, got: ' + t);
});

probe('grade tool: an uncalibrated belt is unchanged; a fast belt is dialed down', () => {
  const plain = gradeUI({ Surface: 'belt', Pace: '8:00', Grade: '5' });
  const fast = gradeUI({ Surface: 'belt', Pace: '8:00', Grade: '5', Cal: '103' });
  const a = mphIn(plain.result), b = mphIn(fast.result);
  assert(a && b, 'both should print an mph');
  assert(!/Dial the belt/.test(plain.result), 'no calibration means no dial language');
  assert(/Dial the belt/.test(fast.result), 'a calibrated belt should tell the coach what to dial');
  assert(b < a, 'a belt running 3% fast must be dialed BELOW the true target (plain ' + a + ', calibrated ' + b + ')');
  assert(Math.abs(b - a / 1.03) < 0.06, 'dial speed should be ~true/1.03 (got ' + b + ')');
  assert(/runs .* mph true/.test(fast.result), 'the true speed should still be shown alongside the dial number');
});

probe('grade tool: every belt number in the detail is a console number too', () => {
  // A 40s rep opens the short-rep bracket and the anchor ladder. If those
  // printed TRUE speed while the headline printed DIAL speed, a coach reading
  // down the panel would get two different numbers for the same prescription.
  const plain = gradeUI({ Surface: 'belt', Pace: '8:00', Grade: '7', Rep: '40' });
  const fast = gradeUI({ Surface: 'belt', Pace: '8:00', Grade: '7', Rep: '40', Cal: '103' });
  assert(/FLOOR/.test(plain.detail), 'a 40s rep should open the bracket');
  const floorOf = (s) => { const m = s.match(/FLOOR<\\/span>[\\s\\S]*?([\\d.]+)\\s*mph/); return m ? Number(m[1]) : null; };
  const p = floorOf(plain.detail), f = floorOf(fast.detail);
  assert(p && f, 'both brackets should print a floor in mph');
  assert(f < p, 'the calibrated bracket must also be in console units (plain ' + p + ', calibrated ' + f + ')');
  assert(Math.abs(f - p / 1.03) < 0.06, 'the bracket floor should scale by the same calibration factor');
});

probe('grade tool: "what effort was this" now reports energy-equivalent distance', () => {
  const up = gradeUI({ Mode: 'observed', Pace: '9:00', Grade: '6', Rep: '1000', RepUnit: 'm' });
  assert(/cost about what/.test(up.detail), 'observed mode should report equivalent distance, got: ' + up.detail);
  const m = up.detail.match(/<strong>(\\d+)m<\\/strong>/);
  assert(m && Number(m[1]) > 1000, 'an uphill km should be worth more than 1000m flat, got: ' + (m && m[1]));
  const down = gradeUI({ Mode: 'observed', Pace: '9:00', Grade: '-6', Rep: '1000', RepUnit: 'm' });
  const dm = down.detail.match(/<strong>(\\d+)m<\\/strong>/);
  assert(dm && Number(dm[1]) < 1000, 'a downhill km should be worth less, got: ' + (dm && dm[1]));
});

probe('grade tool: equivalent distance is fenced off from mileage and impact', () => {
  const d = gradeUI({ Mode: 'observed', Pace: '9:00', Grade: '6', Rep: '1000', RepUnit: 'm' }).detail;
  assert(/Energy only/.test(d) && /mileage/.test(d),
    'the equivalent-distance line must refuse the mileage reading, got: ' + d);
});

probe('grade tool: observed mode reads a calibrated belt as the speed it actually ran', () => {
  const plain = paceIn(gradeUI({ Surface: 'belt', Mode: 'observed', Pace: '8.0', Grade: '5' }).result);
  const fast = paceIn(gradeUI({ Surface: 'belt', Mode: 'observed', Pace: '8.0', Grade: '5', Cal: '103' }).result);
  assert(plain && fast, 'both should convert to a flat pace');
  assert(fast < plain, 'a belt that runs fast means the athlete did MORE work (plain ' + plain + 's, calibrated ' + fast + 's)');
});

probe('grade tool: the lane table ships with the tool and names the lane-1 trap', () => {
  const markup = roadGradeToolHTML('laneProbe', '8:00');
  assert(/only 400m in lane 1/.test(markup), 'the lane table should be discoverable by its claim');
  assert(/453\\.0m/.test(markup), 'lane 8 should be printed');
  assert(/Race staggers cancel this/.test(markup), 'the table must say when the stagger does NOT matter');
});

`;
ctx.html_src = main;
ctx.full_html = html;
try { vm.runInContext(probeSrc, ctx, { filename: 'pace-ui-probes' }); } catch (e) { console.log('PROBE HARNESS ERROR:', e.message); process.exitCode = 1; }

let fails = 0;
for (const [st, label, msg] of ctx.__res) {
  console.log(st, ' ', label, msg ? '\n      ' + msg : '');
  if (st.trim() === 'FAIL') fails++;
}
if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log(`\npace ui probes ok — ${ctx.__res.length} probes`);
