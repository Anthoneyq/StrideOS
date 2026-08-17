// Conference Scorer executable contracts.
//
// Locks the coach-requested difference from a whole-athlete meet calculator:
// one athlete×event exclusion must advance every lower finisher and recompute
// team totals without removing that athlete from their other events.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let assertions = 0;
const ok = (value,message) => { assertions++; assert.ok(value,message); };
const eq = (actual,expected,message) => { assertions++; assert.equal(actual,expected,message); };
const deep = (actual,expected,message) => { assertions++; assert.deepEqual(actual,expected,message); };

function extractBlock(source,startIdx,openChar,closeChar){
  let depth=0;
  for(let i=startIdx;i<source.length;i++){
    if(source[i]===openChar) depth++;
    else if(source[i]===closeChar){ depth--; if(depth===0) return source.slice(startIdx,i+1); }
  }
  throw new Error(`unbalanced ${openChar}${closeChar}`);
}
function extractFn(name){
  const sig=`function ${name}(`, at=html.indexOf(sig);
  assert.ok(at>=0,`missing function ${name}`);
  const argsStart=html.indexOf('(',at); let depth=0,argsEnd=-1;
  for(let i=argsStart;i<html.length;i++){
    if(html[i]==='(') depth++;
    else if(html[i]===')'){ depth--; if(depth===0){ argsEnd=i; break; } }
  }
  const bodyStart=html.indexOf('{',argsEnd);
  return html.slice(at,bodyStart)+extractBlock(html,bodyStart,'{','}');
}
function extractConstObject(name){
  const sig=`const ${name} = {`, at=html.indexOf(sig);
  assert.ok(at>=0,`missing const ${name}`);
  const start=at+sig.length-1;
  return `const ${name} = ${extractBlock(html,start,'{','}')};`;
}

const source = [
  extractConstObject('MEET_SCORER_POINTS'),
  extractFn('parseCsvGrid'),
  extractFn('meetScorerHeaderKey'),
  extractFn('meetScorerColumn'),
  extractFn('parseMeetScorerCsv'),
  extractFn('meetScorerPoints'),
  extractFn('scoreMeetScenarioCore'),
  extractFn('computeMeetScenario'),
  'return {parseMeetScorerCsv,scoreMeetScenarioCore,computeMeetScenario};'
].join('\n');
const S = new Function(source)();

const csv = [
  'Event,Athlete,Team,Rank,Grade,Mark',
  '100m,Ace,Alpha,1,SR,10.10',
  '100m,Bee,Beta,2,JR,10.20',
  '100m,Cece,Gamma,3,SO,10.30',
  '100m,Dee,Beta,4,FR,10.40',
  '100m,Elle,Alpha,5,SR,10.50',
  '200m,Ace,Alpha,1,SR,20.20',
  '200m,Finn,Beta,2,JR,20.40'
].join('\n');
const parsed = S.parseMeetScorerCsv(csv);
eq(parsed.error,'','valid CSV parses');
eq(parsed.records.length,7,'all athlete-event rows survive import');
eq(parsed.records[0].mark,'10.10','mark is retained as source context');

const base = S.computeMeetScenario(parsed.records,{scoringDepth:3,entriesPerTeam:99,maxEventsPerAthlete:99});
deep(base.eventResults['100m'].filter(r=>r.points>0).map(r=>[r.athlete,r.place,r.points]),[
  ['Ace',1,5],['Bee',2,3],['Cece',3,1]
],'baseline places and points follow imported rank');

const changedRecords = parsed.records.map(row=>Object.assign({},row,{enabled:!(row.event==='100m'&&row.athlete==='Ace')}));
const changed = S.computeMeetScenario(changedRecords,{scoringDepth:3,entriesPerTeam:99,maxEventsPerAthlete:99});
deep(changed.eventResults['100m'].filter(r=>r.points>0).map(r=>[r.athlete,r.place,r.points]),[
  ['Bee',1,5],['Cece',2,3],['Dee',3,1]
],'one event exclusion advances every lower finisher');
eq(changed.eventResults['200m'].find(r=>r.athlete==='Ace').points,5,'athlete remains active in their other event');
eq(changed.changedCount,1,'change count is athlete-event specific');
const alpha = changed.teams.find(t=>t.team==='Alpha');
const beta = changed.teams.find(t=>t.team==='Beta');
eq(alpha.delta,-5,'removed event points are isolated from baseline');
eq(beta.delta,3,'displaced teammate/opponent gains are recomputed');

const teamCapRows = S.parseMeetScorerCsv([
  'Event,Athlete,Team,Rank',
  '400m,A1,Alpha,1','400m,A2,Alpha,2','400m,B1,Beta,3','400m,C1,Gamma,4'
].join('\n')).records;
const teamCap = S.scoreMeetScenarioCore(teamCapRows,{scoringDepth:3,entriesPerTeam:1,maxEventsPerAthlete:99});
eq(teamCap.eventResults['400m'].find(r=>r.athlete==='A2').status,'team-cap','per-team event cap is explicit');
deep(teamCap.eventResults['400m'].filter(r=>r.points>0).map(r=>r.athlete),['A1','B1','C1'],'team cap reflows scoring places');

const athleteCapRows = S.parseMeetScorerCsv([
  'Event,Athlete,Team,Rank',
  '100m,Ace,Alpha,1','200m,Ace,Alpha,1','400m,Ace,Alpha,1','100m,Bee,Beta,2'
].join('\n')).records;
const athleteCap = S.scoreMeetScenarioCore(athleteCapRows,{scoringDepth:3,entriesPerTeam:99,maxEventsPerAthlete:2});
eq(athleteCap.eventResults['400m'].find(r=>r.athlete==='Ace').status,'athlete-cap','optional athlete event cap is enforced deterministically');

const combinedCapRows = S.parseMeetScorerCsv([
  'Event,Athlete,Team,Rank',
  '200m,Ace,Alpha,1','100m,Ace,Alpha,1','100m,Backup,Alpha,2','100m,Bee,Beta,3'
].join('\n')).records;
const combinedCap = S.scoreMeetScenarioCore(combinedCapRows,{scoringDepth:3,entriesPerTeam:1,maxEventsPerAthlete:1});
eq(combinedCap.eventResults['100m'].find(r=>r.athlete==='Ace').status,'athlete-cap','athlete cap releases the unused team-event slot');
eq(combinedCap.eventResults['100m'].find(r=>r.athlete==='Backup').status,'scored','next teammate backfills the released team-event slot');
deep(combinedCap.eventResults['100m'].filter(r=>r.points>0).map(r=>r.athlete),['Backup','Bee'],'combined caps preserve valid entrants and reflow the event');

const ties = S.scoreMeetScenarioCore(S.parseMeetScorerCsv([
  'Event,Athlete,Team,Rank','HJ,A,Alpha,1','HJ,B,Beta,2','HJ,C,Gamma,2','HJ,D,Delta,4'
].join('\n')).records,{scoringDepth:3,entriesPerTeam:99,maxEventsPerAthlete:99});
deep(ties.eventResults.HJ.filter(r=>r.points>0).map(r=>[r.athlete,r.place,r.points,r.tie]),[
  ['A',1,5,false],['B',2,2,true],['C',2,2,true]
],'tied imported ranks split occupied-place points');

const teamTie = S.scoreMeetScenarioCore(S.parseMeetScorerCsv([
  'Event,Athlete,Team,Rank','100m,A,Alpha,1','100m,B,Beta,2','200m,C,Beta,1','200m,D,Alpha,2'
].join('\n')).records,{scoringDepth:3,entriesPerTeam:99,maxEventsPerAthlete:99});
deep(teamTie.teams.map(t=>[t.team,t.points,t.place,t.tie]),[
  ['Alpha',8,1,true],['Beta',8,1,true]
],'equal team totals share the same tied standing');

const duplicate = S.parseMeetScorerCsv('Event,Athlete,Team,Rank\n100m,Ace,Alpha,2\n100m,Ace,Alpha,1');
eq(duplicate.records.length,1,'duplicate athlete-event rows collapse');
eq(duplicate.records[0].rank,1,'best imported rank wins duplicate collapse');
ok(S.parseMeetScorerCsv('Name,School\nAce,Alpha').error.includes('Event'),'missing required columns fail clearly');

ok(/data-s="meetscorer"/.test(html),'coach navigation exposes Conference Scorer');
ok(/id="meetscorer"[\s\S]*id="ms-body"/.test(html),'Conference Scorer screen exists');
ok(/strideos_meet_scorer_v1_\$\{owner/.test(html),'scenario storage is account scoped');
ok(/function clearDB\(\)[\s\S]*strideos_meet_scorer_v1_\$\{owner\}/.test(html),'local account wipe removes conference scenarios');
ok(/does not fetch TFRRS or Cloud Training Systems/.test(html),'rendered data boundary is explicit');
ok(/Scenario points, not a readiness or final-result prediction/.test(html),'scenario output avoids readiness/final-result claims');
ok(/location\.hostname === '127\.0\.0\.1'[\s\S]*location\.hostname === 'localhost'/.test(html),'visual preview is hard-limited to localhost');
ok(/aria-label="Include \$\{esc\(row\.athlete\)\} in \$\{esc\(row\.event\)\}"/.test(html),'event assignment checkboxes have explicit accessible names');
ok(/Find athlete<input[^>]*onchange="setMeetScorerQuery/.test(html),'athlete search preserves normal continuous typing before applying');

console.log(`meet scorer probes ok — ${assertions} assertions`);
