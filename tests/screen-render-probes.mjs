// ══════════════════════════════════════════════════════════════════════════
// SCREEN RENDER PROBES (2026-07-31)
// ══════════════════════════════════════════════════════════════════════════
// index.html is a single-file app with no build step, so a render function can
// only be proven by RUNNING it. This loads the app's main <script> into a Node
// VM with a minimal DOM stub, drives it with a fixture roster, and asserts on
// the HTML each renderer actually produces.
//
// It exists because the 2026-07-31 roster-import report ("I select Race
// Forecast and see nothing") was four separate screens failing on one bad
// import, and static regex probes could not have caught any of them.
//
// The stub is deliberately shallow — it covers the DOM surface these renderers
// touch and nothing more. A probe that fails on a missing stub method is a
// harness gap, not a product bug; extend mkEl() rather than weakening the probe.
//
// Run: node tests/screen-render-probes.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(here,'..','index.html'),'utf8');
const main=[...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];

// classList is a REAL set, not a no-op: updateAthleteContextNav's only
// observable effect is classList.toggle('has-athlete', …), so a stubbed-out
// toggle would make any probe of it vacuous.
const mkClassList=()=>{ const set=new Set(); return {
  add(c){set.add(c)}, remove(c){set.delete(c)}, contains(c){return set.has(c)},
  toggle(c,force){ const on = force===undefined ? !set.has(c) : Boolean(force);
    if(on) set.add(c); else set.delete(c); return on; } }; };
const mkEl=()=>({ innerHTML:'', textContent:'', style:{}, classList:mkClassList(),
  setAttribute(){}, removeAttribute(){}, getAttribute(){return null}, appendChild(){}, addEventListener(){},
  querySelectorAll(){return []}, querySelector(){return null}, scrollIntoView(){}, focus(){}, value:'', checked:false, dataset:{} });
const store={};
const doc={ getElementById:(id)=>store[id]||(store[id]=mkEl()), querySelectorAll:()=>[], querySelector:()=>null,
  createElement:()=>mkEl(), addEventListener(){}, body:mkEl(), documentElement:mkEl(), head:mkEl(), title:'', readyState:'complete' };
const ls={_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}};
const win={ addEventListener(){}, matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
  location:{hash:'',search:'',pathname:'/',href:'http://localhost/'}, history:{replaceState(){},pushState(){}},
  localStorage:ls, sessionStorage:ls, scrollTo(){}, navigator:{userAgent:'node',clipboard:{writeText:async()=>{}}},
  print(){}, open(){return null}, requestAnimationFrame:(f)=>setTimeout(f,0) };
const ctx={ document:doc, window:win, localStorage:ls, sessionStorage:ls, navigator:win.navigator, location:win.location,
  history:win.history, console, setTimeout, clearTimeout, setInterval:()=>0, clearInterval(){},
  fetch:async()=>({ok:false,json:async()=>({})}), alert(){}, confirm:()=>true, prompt:()=>null,
  requestAnimationFrame:win.requestAnimationFrame, matchMedia:win.matchMedia, URLSearchParams, __store:store, __res:[] };
ctx.globalThis=ctx; ctx.self=ctx;
vm.createContext(ctx);
try{ vm.runInContext(main, ctx, {filename:'index.html'}); }catch(e){ console.log('LOAD ERROR:', e.message); }

const probeSrc = `
const mk=(o)=>Object.assign({id:'a_'+Math.random().toString(36).slice(2), secondaryEvents:[], additionalPRs:{}, guardrail:null, weeklyMileage:null, trainingAge:0, raceDate:'', age:'', sex:'', grade:''}, o);
DB = { athletes:[
  mk({name:'Riley Chen',sex:'F',grade:'JR',trainingAge:4,primaryEvent:'5K',raceDistance:'5K',raceDistanceM:5000,raceTime:'15:25.27',raceDate:'2024-03-01',weeklyMileage:55,additionalPRs:{'1600m':'4:37.17','3200m':'9:43.74','Mile':'4:48.55','3000m':'9:16.84','2 Mile':'9:57.65'}}),
  mk({name:'Dana Ruiz',sex:'M',grade:'SR',trainingAge:3,primaryEvent:'800m',raceDistance:'800m',raceDistanceM:800,raceTime:'1:53.51',raceDate:'2026-01-01',additionalPRs:{'1600m':'4:17.94','400m':'59.04'}}),
  mk({name:'Sam Park',sex:'M',grade:'SO',trainingAge:0,primaryEvent:'2400m',raceDistance:'',raceDistanceM:null,raceTime:''}),
  mk({name:'Jo Ellis',sex:'F',grade:'FR',trainingAge:2,primaryEvent:'1600m',raceDistance:'1600m',raceDistanceM:1600,raceTime:'5:20.00',raceDate:'2026-04-01'})
], activeAthleteId:null };
DB.activeAthleteId = DB.athletes[0].id;
A = DB.athletes[0];
saveDB = function(){}; toast = function(){}; sbSubscription = { tier:'pro', hasProAccess:true }; sbUser=null; sbRole=null;
const out = id => String(__store[id] ? __store[id].innerHTML : '');
const probe=(label,fn)=>{ try{ fn(); __res.push(['OK   ',label,'']); }catch(e){ __res.push(['FAIL ',label,(e&&e.message)||String(e)]); } };

probe('renderRoster shows filter bar + athletes', ()=>{ renderRoster(); const h=out('ro-body'); if(!/Find an athlete/.test(h)) throw new Error('no filter bar'); if(!/Riley Chen/.test(h)) throw new Error('no athlete'); });
probe('filter: name search narrows', ()=>{ setRosterFilter('q','dana'); const h=out('ro-list'); if(!/Dana Ruiz/.test(h)||/Riley Chen/.test(h)) throw new Error('did not narrow'); });
probe('filter: sex', ()=>{ setRosterFilter('q',''); setRosterFilter('sex','F'); const h=out('ro-list'); if(/Dana Ruiz/.test(h)) throw new Error('male not excluded'); if(!/Jo Ellis/.test(h)) throw new Error('female missing'); });
probe('filter: event family', ()=>{ setRosterFilter('sex',''); setRosterFilter('group','Distance'); const h=out('ro-list'); if(!/Riley Chen/.test(h)||/Jo Ellis/.test(h)) throw new Error('family filter wrong'); });
probe('filter: year/grade', ()=>{ setRosterFilter('group',''); setRosterFilter('grade','SR'); const h=out('ro-list'); if(!/Dana Ruiz/.test(h)||/Riley Chen/.test(h)) throw new Error('grade filter wrong'); });
probe('filter: specific event', ()=>{ setRosterFilter('grade',''); setRosterFilter('event','1600m'); const h=out('ro-list'); if(!/Jo Ellis/.test(h)||/Riley Chen/.test(h)) throw new Error('event filter wrong'); });
probe('filter: 2+ PRs', ()=>{ setRosterFilter('event',''); setRosterFilter('prs','multi'); const h=out('ro-list'); if(/Sam Park/.test(h)) throw new Error('no-PR athlete shown'); });
probe('filter: sort by most PRs', ()=>{ setRosterFilter('prs',''); setRosterFilter('sort','prs'); const h=out('ro-list'); if(h.indexOf('Riley Chen') > h.indexOf('Jo Ellis')) throw new Error('sort wrong'); });
probe('filter: no match empty state', ()=>{ setRosterFilter('q','zzzz'); if(!/No athletes match/.test(out('ro-list'))) throw new Error('missing empty state'); });
probe('clearRosterFilters restores', ()=>{ clearRosterFilters(); const h=out('ro-body'); if(!/Riley Chen/.test(h)||!/Sam Park/.test(h)) throw new Error('not restored'); });

probe('roster: a dateless PR is surfaced, not silently costing confidence', ()=>{ sbUser={id:'c1'}; sbRole=null;
  const a = DB.athletes[0]; const keep = a.raceDate; a.raceDate = '';
  renderRoster(); const h = out('ro-body');
  if(!/no date/i.test(h)) throw new Error('dateless PR not surfaced');
  if(!/Riley Chen/.test(h)) throw new Error('does not name who to fix');
  a.raceDate = keep; renderRoster();
  if(/CONFIDENCE COST/.test(out('ro-body'))) throw new Error('banner persists once every PR has a date');
  sbUser=null; });

probe('renderCompare full render', ()=>{ renderCompare(); const h=out('cp-body'); ['Pick up to 3','Side by side','Leveled to one distance','Event by event','Range curve'].forEach(s=>{ if(h.indexOf(s)<0) throw new Error('missing: '+s); }); });
probe('compare: 3 athletes selected by default', ()=>{ const h=out('cp-body'); const n=['Riley Chen','Dana Ruiz','Jo Ellis','Sam Park'].filter(x=>h.indexOf('>'+x)>=0||h.indexOf(x)>=0).length; if(compareState.ids.filter(Boolean).length!==3) throw new Error('slots='+JSON.stringify(compareState.ids)); });
probe('compare: leveled table ranks', ()=>{ const h=out('cp-body'); if(!/OBSERVED|FORECAST/.test(h)) throw new Error('no basis badges'); });
probe('compare: retarget distance', ()=>{ setCompareTarget(1600); const h=out('cp-body'); if(!/At 1600m/.test(h)) throw new Error('target not applied'); });
probe('compare: slot swap dedupes', ()=>{ setCompareSlot(1, compareState.ids[0]); if(new Set(compareState.ids.filter(Boolean)).size !== compareState.ids.filter(Boolean).length) throw new Error('duplicate athlete allowed'); });
probe('compare: needs 2', ()=>{ setCompareSlot(0,''); setCompareSlot(1,''); setCompareSlot(2,''); const h=out('cp-body'); if(!/Select at least 2/.test(h)) throw new Error('should ask for 2'); });
probe('compare: SVG curve renders', ()=>{ compareState={ids:[DB.athletes[0].id,DB.athletes[1].id,''],targetM:null}; renderCompare(); const h=out('cp-body'); if(!/<svg/.test(h)) throw new Error('no svg'); if(!/<path d="M/.test(h)) throw new Error('no line path'); });

// The front-door answer to the first objection a high-school program raises.
// Signed-out only — a signed-in coach already accepted these at signup.
probe('home: data promise answers ads / selling / deletion / minors', ()=>{ sbUser=null; renderHome(); const h=out('home-body');
  [/No ads, ever/, /never sell athlete data/, /delete it/, /Minors:/].forEach(re=>{ if(!re.test(h)) throw new Error('missing: '+re); });
  if(!/privacy\.html/.test(h)) throw new Error('no link to the full policy');
  if(/substitute for the full/.test(h) === false) throw new Error('does not disclaim being the policy itself'); });
probe('home: the promise is not shown to a signed-in coach', ()=>{ sbUser={id:'c1'}; renderHome(); const h=out('home-body');
  if(/home-datapromise/.test(h)) throw new Error('shown when signed in'); sbUser=null; });

probe('overview: athlete picker present', ()=>{ renderOverview(); const h=out('ov-body'); if(!/ov-athlete-picker/.test(h)) throw new Error('no picker select'); if(!/Compare athletes/.test(h)) throw new Error('no compare button'); });
probe('overview: one graph includes every roster athlete', ()=>{ renderOverview(); const h=out('ov-body');
  if(!/Roster Event Map/.test(h)) throw new Error('no roster map');
  DB.athletes.forEach(a=>{ if(!h.includes(a.name)) throw new Error('map missing '+a.name); });
  if(!/No primary mark/.test(h)) throw new Error('athlete without a usable mark disappeared');
  if(!/not a readiness or talent ranking/.test(h)) throw new Error('map lacks interpretation boundary');
});
probe('roster map: sorts by event distance then time', ()=>{
  const rows=rosterMapRows(DB.athletes);
  const named=rows.map(r=>r.athlete.name);
  if(named.indexOf('Dana Ruiz') > named.indexOf('Jo Ellis') || named.indexOf('Jo Ellis') > named.indexOf('Riley Chen')) throw new Error('event order wrong: '+named.join(', '));
  if(named[named.length-1] !== 'Sam Park') throw new Error('no-mark athlete should remain visible at end');
});
probe('selectAthleteInPlace switches', ()=>{ currentScreen='overview'; selectAthleteInPlace(DB.athletes[1].id); if(!A || A.name!=='Dana Ruiz') throw new Error('active not switched: '+(A&&A.name)); A=DB.athletes[0]; DB.activeAthleteId=A.id; });

probe('profile: known event shows its own demands', ()=>{ A=DB.athletes[0]; renderProfile(); const h=out('pr-body'); if(!/Event Demands · 5K/.test(h)) throw new Error('not 5K'); if(/closest supported event/.test(h)) throw new Error('unexpected substitution notice'); });
probe('profile: unknown event is honest, not silent 800m', ()=>{ A=DB.athletes[2]; renderProfile(); const h=out('pr-body'); if(/Event Demands · 800m/.test(h) && !/closest supported event/.test(h)) throw new Error('silent 800m fallback'); if(!/No primary event set|closest supported event/.test(h)) throw new Error('no honest state'); });
probe('overview energy panel: no silent 800m', ()=>{ sbRole='athlete'; A=DB.athletes[2]; renderOverview(); const h=out('ov-body'); if(/Energy System Profile · 800m/.test(h) && !/closest supported event/.test(h)) throw new Error('silent 800m fallback'); sbRole=null; });

probe('predict renders for a merged athlete', ()=>{ A=DB.athletes[0]; renderPredict(); const h=out('pd-body'); if(/Enter a valid race result/.test(h)) throw new Error('empty state'); if(!/Race Predictions/.test(h)) throw new Error('no predictions'); });
probe('performance curve renders for a merged athlete', ()=>{ renderMultiEvent(); const h=out('me-body'); if(/Need at least 2 race results/.test(h)) throw new Error('empty state'); if(!/Performance Curve/.test(h)) throw new Error('no curve'); });
probe('event fit is not 400/800 for a 5K runner', ()=>{ const h=out('me-body'); const m=h.match(/Strongest Distance<\\/p>\\s*<p[^>]*>([^<]+)</); const best=m?m[1].trim():'?'; if(['400m','800m'].includes(best)) throw new Error('classified as '+best); __res.push(['note ','strongest distance = '+best,'']); });
probe('predict empty-state athlete still safe', ()=>{ A=DB.athletes[2]; renderPredict(); renderMultiEvent(); renderOverview(); });

// ── CONSENSUS CURVE (2026-08-10) ──
// The strength map was an artifact of anchor choice: an elite 5K anchor read
// every shorter event as a gap, and a sprinter's weak 5K anchor read her whole
// chart green with the curve floating far below the dots. The curve and every
// verdict now come from the leave-one-out median of the athlete's OWN marks.
probe('consensus: elite 5K athlete is not all-red at shorter events', ()=>{
  A=DB.athletes[0]; renderMultiEvent(); const h=out('me-body');
  const gaps=(h.match(/>GAP</g)||[]).length;
  if(gaps>=4) throw new Error('most events still read GAP ('+gaps+') — anchor tilt not fixed');
  if(!/PRIMARY/.test(h)) throw new Error('primary event has no verdict row of its own'); });
probe('consensus: a weak primary 5K on a speed athlete reads as the gap it is', ()=>{
  const mk2=(o)=>Object.assign({id:'x_'+Math.random().toString(36).slice(2), secondaryEvents:[], additionalPRs:{}, guardrail:null, weeklyMileage:null, trainingAge:2, raceDate:'2026-05-01', age:'', sex:'F', grade:'JR'}, o);
  const spr=mk2({name:'Chachi Fixture',primaryEvent:'5K',raceDistance:'5K',raceDistanceM:5000,raceTime:'17:20.0',additionalPRs:{'200m':'25.94','400m':'57.30','1600m':'4:42.0','3200m':'10:24.9'}});
  DB.athletes.push(spr); A=spr; renderMultiEvent(); const h=out('me-body');
  const row=h.split('<tr>').find(r=>/5K/.test(r)&&/PRIMARY/.test(r));
  if(!row) throw new Error('no primary 5K row');
  if(!/DEVELOPMENT|GAP/.test(row)) throw new Error('slow primary 5K not flagged as development/gap');
  DB.athletes.pop(); A=DB.athletes[0]; });
probe('consensus: curve line hugs the marks (dots not systematically above line)', ()=>{
  A=DB.athletes[0]; const prs=collectAllPRs(A);
  let above=0, below=0;
  prs.forEach(p=>{ const cons=consensusForecastAt(prs, p.distM, A, {leaveOneOut:true}); if(!cons) return; if(p.sec<cons) above++; else below++; });
  if(above===prs.length||below===prs.length) throw new Error('every dot on one side of its consensus — median fit broken ('+above+'/'+below+')'); });

probe('duplicate repair: banner hidden when roster is clean', ()=>{ renderRoster(); if(/MERGE AVAILABLE/.test(out('ro-body'))) throw new Error('banner shown on a clean roster'); });
probe('duplicate repair: detects a one-row-per-race roster', ()=>{
  const dup = (ev, distM, t, date, created) => mk({name:'Elizabeth Leachman',sex:'F',grade:'FR',primaryEvent:ev,raceDistance:ev,raceDistanceM:distM,raceTime:t,raceDate:date,createdAt:created,updatedAt:created});
  DB.athletes = DB.athletes.concat([
    dup('1600m',1600,'','', '2026-07-30T00:00:00Z'),
    dup('5K',5000,'19:06.70','2022-11-01','2026-07-30T00:01:00Z'),
    dup('1600m',1600,'4:52.46','2023-04-01','2026-07-30T00:02:00Z'),
    dup('5K',5000,'15:25.27','2024-03-01','2026-07-30T00:03:00Z'),
    dup('3200m',3200,'9:43.74','2024-05-01','2026-07-30T00:04:00Z'),
    dup('Mile',1609,'4:48.55','2025-04-01','2026-07-30T00:05:00Z'),
  ]);
  DB.athletes[DB.athletes.length-1].grade = 'JR';
  renderRoster();
  const h = out('ro-body');
  if(!/MERGE AVAILABLE/.test(h)) throw new Error('banner not shown');
  if(!/6 roster entries look like 1 athlete/.test(h)) throw new Error('wrong counts in the merge banner');
});
probe('duplicate repair: preview shows the merged result', ()=>{ showDuplicateRepairPreview(); const h=out('ro-body'); if(!/NOTHING APPLIED YET/.test(h)) throw new Error('no preview'); if(!/6 → 1/.test(h)) throw new Error('entry count missing'); if(!/15:25.27/.test(h)) throw new Error('fastest 5K not chosen as primary'); });
probe('duplicate repair: singletons are untouched by the plan', ()=>{ const plan=duplicateRepairPlan(); if(plan.merges.length!==1) throw new Error('merged more than the duplicate group'); if(plan.merges[0].name!=='Elizabeth Leachman') throw new Error('wrong group'); });
probe('duplicate repair: apply keeps every mark', ()=>{
  sbUser = { id:'u1' };   // roster is a workspace screen; a coach reaching it is signed in
  const before = DB.athletes.length;
  const survivorId = duplicateRepairPlan().merges[0].id;
  DB.activeAthleteId = DB.athletes[DB.athletes.length-1].id;   // an entry that will be absorbed
  DB.workouts = [{id:'w1', athleteId: DB.athletes[DB.athletes.length-1].id, type:'run'}];
  applyDuplicateRepair();
  if(DB.athletes.length !== before - 5) throw new Error('wrong survivor count: '+DB.athletes.length);
  const e = DB.athletes.find(a=>a.name==='Elizabeth Leachman');
  if(!e) throw new Error('athlete lost');
  if(e.id !== survivorId) throw new Error('survivor id changed — training log would orphan');
  if(e.raceTime !== '15:25.27') throw new Error('fastest 5K not primary: '+e.raceTime);
  if(e.primaryEvent !== '5K') throw new Error('primary event wrong: '+e.primaryEvent);
  if(e.grade !== 'JR') throw new Error('grade should come from the most recent entry: '+e.grade);
  const prs = collectAllPRs(e);
  if(prs.length !== 4) throw new Error('marks lost — expected 4 distinct events, got '+prs.length);
  ['1600m','3200m','Mile'].forEach(ev=>{ if(!(ev in e.additionalPRs)) throw new Error('lost '+ev); });
  if(e.additionalPRs['1600m'] !== '4:52.46') throw new Error('slower 1600m kept: '+e.additionalPRs['1600m']);
  if(DB.workouts[0].athleteId !== survivorId) throw new Error('workout orphaned');
  if(DB.activeAthleteId !== survivorId) throw new Error('active athlete orphaned');
  if(DB.athletes.filter(a=>a.name==='Riley Chen').length !== 1) throw new Error('a singleton was touched');
});
probe('duplicate repair: banner clears after merging', ()=>{ renderRoster(); if(/MERGE AVAILABLE/.test(out('ro-body'))) throw new Error('banner still shown'); });
probe('duplicate repair: merged athlete now renders forecasts + curve', ()=>{ A = DB.athletes.find(a=>a.name==='Elizabeth Leachman'); renderPredict(); renderMultiEvent(); if(/Enter a valid race result/.test(out('pd-body'))) throw new Error('forecast still empty'); if(/Need at least 2 race results/.test(out('me-body'))) throw new Error('curve still empty'); });

// ── ATHLETE-CONTEXT BAR VISIBILITY (behavioral) ──────────────────────────
// The per-athlete tools (Performance Curve, Race Forecasts, Training Paces,
// Training Log, More) exist ONLY in this bar — the nav reorg took them out of
// the sidebar. If the bar hides on the screens a coach starts from, those
// tools are unreachable. This EXECUTES updateAthleteContextNav and reads the
// resulting class, rather than pattern-matching the source.
const barShown = (screen) => {
  currentScreen = screen;
  updateAthleteContextNav();
  return __store['athleteContextNav'].classList.contains('has-athlete');
};
probe('context bar: visible on the screens a coach starts from', ()=>{
  sbUser = { id:'u1' }; sbRole = null;
  A = DB.athletes.find(a=>a.name==='Riley Chen') || DB.athletes[0];
  DB.activeAthleteId = A.id;
  ['overview','roster','compare'].forEach(s=>{
    if(!barShown(s)) throw new Error('hidden on '+s+' — its tools are reachable nowhere else');
  });
});
probe('context bar: visible on the athlete tool screens themselves', ()=>{
  ['multievent','predict','paces','workouts','raceshape','profile','proof','edit'].forEach(s=>{
    if(!barShown(s)) throw new Error('hidden on '+s);
  });
});
probe('context bar: hidden on public / no-athlete screens', ()=>{
  ['home','eventfit','methodology','import'].forEach(s=>{
    if(barShown(s)) throw new Error('shown on '+s+' where no athlete is in play');
  });
});
probe('context bar: hidden when signed out', ()=>{
  const keep = sbUser; sbUser = null;
  const shown = barShown('overview');
  sbUser = keep;
  if(shown) throw new Error('shown to a signed-out visitor');
});
probe('context bar: hidden with no athlete selected', ()=>{
  const keep = A; A = null;
  const shown = barShown('overview');
  A = keep;
  if(shown) throw new Error('shown with no athlete selected');
});
probe('context bar: names the selected athlete', ()=>{
  barShown('roster');
  if(__store['athleteContextName'].textContent !== A.name) throw new Error('wrong name: '+__store['athleteContextName'].textContent);
  const keep = A; A = null; barShown('roster');
  if(__store['athleteContextName'].textContent !== 'No athlete selected') throw new Error('stale name left on screen');
  A = keep;
});
__res;
`;
try{ vm.runInContext(probeSrc, ctx, {filename:'probe'}); }catch(e){ console.log('PROBE SCRIPT ERROR:', e.message); }
ctx.__res.forEach(r=>console.log(r[0], r[1], r[2]?('-> '+r[2]):''));

const fails = ctx.__res.filter(r => r[0] === 'FAIL ');
const count = ctx.__res.filter(r => r[0] !== 'note ').length;
if(fails.length){
  fails.forEach(f => console.error('PROBE FAIL: ' + f[1] + ' -> ' + f[2]));
  process.exit(1);
}
console.log(`screen render probes ok — ${count} probes`);
