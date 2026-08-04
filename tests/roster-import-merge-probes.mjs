// ══════════════════════════════════════════════════════════════════════════
// ROSTER IMPORT — LONG-FORMAT MERGE PROBES (2026-07-31)
// ══════════════════════════════════════════════════════════════════════════
// Anthoney imported a real 13-runner season export (236 rows, one row per race
// result) and got 236 near-empty athletes: Race Forecasts and Performance Curve
// both showed their empty states, Event Demands showed an 800m profile for a 5K
// runner, the active athlete never changed, and everyone imported as
// "Beginner — 0 yrs".
//
// These probes execute the real functions out of index.html against a fixture
// with the same SHAPE as that export (multiple rows per athlete, two time
// columns, dash placeholders, unsupported events, multi-season history). The
// fixture is synthetic — no athlete data lives in this repo.
//
// Run: node tests/roster-import-merge-probes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');

let assertions = 0;
function ok(cond, msg){
  assertions++;
  if(!cond) throw new Error('PROBE FAIL: ' + msg);
}
function near(actual, expected, tol, msg){
  ok(Math.abs(actual - expected) <= tol, `${msg} (got ${actual}, expected ~${expected})`);
}

// ── Load the real implementation out of the single-file app ──
function slice(startMarker, endMarker){
  const i = html.indexOf(startMarker);
  if(i < 0) throw new Error('probe could not find source marker: ' + startMarker);
  const j = html.indexOf(endMarker, i);
  if(j < 0) throw new Error('probe could not find end marker: ' + endMarker);
  return html.slice(i, j);
}

const source = [
  slice('const DIST = {', '};') + '};',
  slice('const IMPORT_FIELDS = [', '];') + '];',
  slice('const EVENT_PR_FIELDS = [', '];') + '];',
  slice('function autoDetectColumns(headers){', '\nfunction renderImportMapping'),
  slice('const GRADE_LADDER = {', '\nfunction _athleteNameKey'),
  slice('function _normEvent(v){', '\nfunction _normDate'),
  slice('function _normDate(v){', '\nfunction _plausibleImportTime'),
  slice('function _normSex(v){', '\n// Best-effort parse'),
  slice('function parseTime(s){', '\nfunction fmtT'),
  slice('function _plausibleImportTime(val, event){', '\nasync function applyImport'),
].join('\n');

const { autoDetectColumns, mergeImportRows, _normEvent, parseTime } =
  new Function(source + '\nreturn { autoDetectColumns, mergeImportRows, _normEvent, parseTime };')();

// ── Fixture: the shape of a school season / meet export ──────────────────
const HEADERS = ['Name','Sex','School','Year','Season','Grade','Sport','Event',
                 'Season_Best_Time','PR_Time','PR_Date','Place_Finish','Meet_Name','Notes'];
const R = (...vals) => Object.fromEntries(HEADERS.map((h, i) => [h, vals[i] ?? '']));

const ROWS = [
  // Distance runner, 5 competition years, most-raced event is 5K.
  R('Riley Chen','F','North HS','2021','Spring','7th','Track','1600m','—','—','—','','MS Meet',''),
  R('Riley Chen','F','North HS','2022','Spring','8th','Track','2400m','—','—','—','','MS Meet',''),
  R('Riley Chen','F','North HS','2022','Fall','FR','Cross Country','5K XC','19:06.70','19:06.70','11/2022','20th','State',''),
  R('Riley Chen','F','North HS','2023','Spring','FR','Track','1600m','4:52.46','4:52.46','04/01/2023','4th','Region',''),
  R('Riley Chen','F','North HS','2023','Fall','SO','Cross Country','5K XC','16:25.50','16:25.50','11/04/2023','1st','State',''),
  R('Riley Chen','F','North HS','2024','Spring','SO','Track','3200m','9:43.74','9:43.74','05/2024','1st','State',''),
  R('Riley Chen','F','North HS','2024','Spring','SO','Track','5000m (indoor)','15:28.90','15:25.27','03/2024','1st','Nationals',''),
  R('Riley Chen','F','North HS','2025','Fall','JR','Cross Country','5K XC','17:14.80','16:25.50','10/2025','1st','District',''),
  // Sprinter with relay rows that must not become events.
  R('Dana Ruiz','M','North HS','2024','Spring','JR','Track','100m','10.51','10.51','04/2024','1st','Relays',''),
  R('Dana Ruiz','M','North HS','2024','Spring','JR','Track','4x400m Relay','3:18.44','3:18.44','04/2024','1st','Relays',''),
  R('Dana Ruiz','M','North HS','2025','Spring','SR','Track','200m','20.57','20.57','05/2025','1st','State',''),
  // Rows that must be skipped outright.
  R('','F','North HS','2025','Spring','SR','Track','800m','2:20.00','2:20.00','','','',''),
  // Implausible / placeholder times must never become marks.
  R('Sam Park','M','North HS','2025','Spring','SO','Track','800m','0:00','2.05','05/2025','','Dual',''),
];

const mapping = autoDetectColumns(HEADERS);

// ── Column auto-detection ────────────────────────────────────────────────
ok(mapping.name === 'Name', 'name column auto-detected');
ok(mapping.primaryEvent === 'Event', 'event column auto-detected');
ok(mapping.grade === 'Grade', 'Grade maps to grade, not Year');
ok(mapping.seasonYear === 'Year', 'Year maps to the season column that feeds training-age derivation');
ok(mapping.raceTime && mapping.raceTime2 && mapping.raceTime !== mapping.raceTime2,
  'BOTH time columns on a season export are mapped, not just one');
ok([mapping.raceTime, mapping.raceTime2].includes('PR_Time') &&
   [mapping.raceTime, mapping.raceTime2].includes('Season_Best_Time'),
  'the two mapped time columns are Season_Best_Time and PR_Time');

// ── Event normalisation ──────────────────────────────────────────────────
ok(_normEvent('5K XC').raceDistance === '5K', 'XC tag stripped');
ok(_normEvent('5000m (indoor)').raceDistance === '5K',
  'venue qualifier in parentheses no longer produces an unmappable event');
ok(_normEvent('1600m - Finals').raceDistance === '1600m', 'round suffix stripped');
ok(!_normEvent('2400m').raceDistance, '2400m is not guessed at — it has no app constants');
ok(!_normEvent('4x400m Relay').raceDistance, 'relays are not treated as an individual event');

// ── The merge itself ─────────────────────────────────────────────────────
const merged = mergeImportRows(ROWS, mapping);
const byName = Object.fromEntries(merged.athletes.map(a => [a.name, a]));

ok(merged.athletes.length === 3,
  `13 result rows collapse to 3 athletes (got ${merged.athletes.length}) — the bug was one athlete per ROW`);
ok(merged.skipped.some(s => s.reason === 'no name'), 'nameless rows are skipped');
ok(merged.skipped.some(s => /unsupported event "2400m"/.test(s.reason)),
  'an unsupported event is REPORTED, not silently dropped or guessed');
ok(merged.skipped.some(s => /4x400m Relay/.test(s.reason)), 'relay rows are reported as unsupported');

const riley = byName['Riley Chen'];
ok(riley, 'the multi-season athlete came through');
ok(riley.primaryEvent === '5K',
  `primary event is the most-raced event, not the first row's (got ${riley.primaryEvent})`);
ok(riley.raceTime === '15:25.27',
  `the FASTEST valid mark at the primary event wins across both time columns (got ${riley.raceTime})`);
ok(riley.raceDate === '2024-03-01',
  `the PR date belongs to the PR itself, not an older race (got ${riley.raceDate})`);
ok(riley.sex === 'F' && riley.grade === 'JR',
  'stable attributes carry forward; grade takes the most recent season');
ok(Object.keys(riley.additionalPRs).length >= 2,
  'other events survive as additional PRs so the curve and forecasts have data');
ok(riley.additionalPRs['1600m'] === '4:52.46', '1600m best kept as an additional PR');
ok(riley.additionalPRs['3200m'] === '9:43.74', '3200m best kept as an additional PR');
ok(!('5K' in riley.additionalPRs), 'the primary event is not duplicated into additionalPRs');
ok(riley.markCount >= 3, 'the merged athlete has enough marks for Event Fit (needs 2+)');

// The whole point: these are the preconditions the downstream screens check.
ok(parseTime(riley.raceTime) > 0 && riley.raceDistanceM === 5000,
  'renderPredict precondition met (raceDistanceM + parseable raceTime) — Race Forecasts will render');
ok(Object.keys(riley.additionalPRs).length + 1 >= 2,
  'renderMultiEvent precondition met (2+ PRs) — Performance Curve will render');

// ── Training age derived from season history ─────────────────────────────
// A FLOOR, per Anthoney 2026-08-04: "3 years of data = at least 3 years of
// training. Coaches can specify otherwise if needed." Five competition years on
// file is five years of training, not the four-year gap between first and last.
ok(riley.trainingAge === 5,
  `training age is the seasons on file, 2021→2025 (got ${riley.trainingAge}) — importing a 5-season runner as a 0-yr beginner put them on beginner guardrails`);
ok(riley.trainingAgeDerived === true, 'the derived training age is flagged for disclosure');
ok(riley.seasonsOnFile >= 5, 'the number of seasons behind the derivation is reported');

const stated = mergeImportRows(ROWS, { ...mapping, trainingAge: 'Place_Finish' });
const rileyStated = stated.athletes.find(a => a.name === 'Riley Chen');
ok(rileyStated.trainingAgeDerived === false,
  'a real training-age column always beats the derived value');

// ── Implausible times ────────────────────────────────────────────────────
const sam = byName['Sam Park'];
ok(sam, 'an athlete with only bad times still imports (the coach can fix the time)');
ok(!sam.raceTime,
  '"0:00" and Excel-decimalised "2.05" never become an 800m mark');

// ── Sprinter ─────────────────────────────────────────────────────────────
const dana = byName['Dana Ruiz'];
ok(dana.primaryEvent === '100m' || dana.primaryEvent === '200m', 'sprinter keeps a sprint primary');
ok(!Object.keys(dana.additionalPRs).some(e => /Relay/.test(e)), 'no relay ever lands in additionalPRs');
near(parseTime(dana.raceTime), parseTime(dana.raceTime), 0, 'sprinter has a parseable mark');

// ── Wide format still works (one row per athlete) ────────────────────────
const WIDE_HEADERS = ['Name','Sex','Grade','Primary Event','PR Time','PR Date','800m','1600m','3200m','Weekly Miles'];
const wideRows = [
  Object.fromEntries(WIDE_HEADERS.map((h, i) =>
    [h, ['Alex Kim','M','SR','1600m','4:20.00','2026-04-01','1:58.20','4:20.00','9:35.00','45'][i]])),
  Object.fromEntries(WIDE_HEADERS.map((h, i) =>
    [h, ['Jo Ellis','F','JR','800m','2:15.00','2026-04-01','2:15.00','','','38'][i]])),
];
const wideMapping = autoDetectColumns(WIDE_HEADERS);
const wide = mergeImportRows(wideRows, wideMapping);
ok(wide.athletes.length === 2, 'a wide-format roster still imports one athlete per row');
const alex = wide.athletes.find(a => a.name === 'Alex Kim');
ok(alex.primaryEvent === '1600m', 'wide-format primary event is preserved');
ok(alex.raceTime === '4:20.00', 'wide-format PR time is preserved');
ok(alex.additionalPRs['800m'] === '1:58.20' && alex.additionalPRs['3200m'] === '9:35.00',
  'wide-format event columns still populate additionalPRs');
ok(alex.weeklyMileage === 45, 'wide-format weekly mileage is preserved');

// ── Post-import wiring the screens depend on ─────────────────────────────
ok(/if\(importedIds\.length\) DB\.activeAthleteId = importedIds\[0\];/.test(html),
  'an import always makes an imported athlete active — otherwise every screen keeps showing the PREVIOUS athlete and the import looks like a no-op');
ok(/Season \/ meet export detected/.test(html),
  'the mapping screen tells the coach when rows will be merged per athlete');

// ── The 800m silent-fallback fix ─────────────────────────────────────────
ok(!/DEMANDS\[A\.primaryEvent\]\|\|DEMANDS\['800m'\]/.test(html),
  "Event Demands no longer silently falls back to an 800m profile");
ok(!/ENERGY_SYSTEMS\[A\.primaryEvent\] \|\| ENERGY_SYSTEMS\['800m'\]/.test(html),
  "the energy-system panel no longer silently falls back to 800m");
ok(/function resolveEventProfileKey\(athlete, table\)/.test(html),
  'event constants resolve through a shared, honest resolver');
ok(/function eventSubstitutionNotice\(res\)/.test(html),
  'when a substitution happens it is stated on screen');

// ── Roster filters + compare exist and are wired ─────────────────────────
['q','event','group','grade','sex','prs','sort'].forEach(k =>
  ok(new RegExp(`\\b${k}:`).test(html.slice(html.indexOf('let rosterFilters = {'), html.indexOf('let rosterFilters = {') + 200)),
    `roster filter '${k}' exists`));
ok(/function filteredRoster\(list\)/.test(html), 'roster filtering is a real function, not inline');
ok(/id="ro-list"/.test(html), 'the roster list re-renders on its own so the search box keeps focus');
ok(/const COMPARE_MAX = 3;/.test(html), 'compare supports up to 3 athletes');
ok(/WORKSPACE_SCREEN_IDS = new Set\(\[\s*'roster',\s*'compare',/.test(html),
  'the compare screen is registered as a workspace screen');
ok(/if\(id==='compare'\)\s*renderCompare\(\);/.test(html), 'goTo dispatches the compare screen');
ok(/case 'compare':\s*renderCompare\(\);/.test(html), 'refreshCurrentScreen re-renders compare');
ok(/function selectAthleteInPlace\(id\)/.test(html),
  'the dashboard can change the active athlete without navigating away');

console.log(`roster import merge probes ok — ${assertions} assertions`);
