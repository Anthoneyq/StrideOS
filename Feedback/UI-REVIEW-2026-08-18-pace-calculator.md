# Pace Calculator UI Review — 2026-08-18

Triggered by Alex Muntefering's round-2 voice-note feedback (clickable workout target,
"I shouldn't have to recalculate," group pacing not apparent, density / weak call-outs).
Method: live app captured headlessly at strideos.thecoachlab.app with a seeded demo athlete
(1600m 5:32 PR + 800m 2:28.4 / 5K 19:45 additional PRs), three states screenshotted
(default, all sections expanded, current-fitness override applied), interaction probes run,
then four independent reviews: HS athlete, volunteer coach, elite coach, UI/UX analyst.
Screenshots + probes: session scratchpad `shots/` (ephemeral); findings preserved here.

## Empirical facts established first (main session, verified in-browser)

1. **The page already live-updates everywhere.** Typing 95°F into Condition Adjustment
   instantly changed the hero (2:46.0 → 3:07.6) and every split-table cell; the intensity
   slider updates instantly too (`oninput="updateBuilder();refreshDanielsTable()"`,
   index.html:9441–9449). Alex's staleness complaint is a *feedback-visibility* failure,
   not a data-flow failure.
2. **The top-right "Recalculate" button** (index.html:1506) just calls `calcPaces()` — a
   re-render shim. Its existence is what *teaches* users the page is stale.
3. **The hero "800m in 2:46" is inert text** (index.html:9318–9334). Its real controls
   (slider + Rep distance dropdown) sit in a separate card below (9339–9372). The
   controls are always visible — not hidden — but disconnected from the number they drive.
4. **The athlete-independent calculator already exists** (`renderFreeTierCalculator()`,
   index.html:9662) but is only reachable signed-out / no-athlete (gate at 9271). A
   signed-in coach can never see it — which is why Alex "found" it only ambiguously.

## Persona verdicts

| Persona | Score | One-line verdict |
|---|---|---|
| HS athlete (16) | 6/10 comprehension | Headline number is instantly clear; everything below reads as scary coach-jargon they're afraid to touch. |
| Volunteer coach | 6/10 run-practice | Split table + fitness override work in plain English; the heat adjustment — the highest-stakes feature — is the most jargon-dense thing on the page. |
| Elite coach | 5/10 vs spreadsheet | Flat %-of-race-pace rows read as *predictions* and contradict the athlete's own PRs; no group workflow on this screen. |
| UI/UX analyst | — | Two blockers: vestigial Recalculate button, invisible live updates. Hierarchy collapses because one mono-uppercase label style is used for ~15 different jobs. |

## Consolidated findings (deduped, severity-ordered)

### Blockers
- **B1 — "Recalculate" button creates the staleness myth.** Delete it; it's the direct
  cause of Alex's complaint. (index.html:1506)
- **B2 — 150 numbers change with zero visual acknowledgment.** The inputs a coach touches
  (condition fields) sit 700–1500px below/above the cells that change. Add a ~600ms
  accent flash on the hero + changed cells and a transient "PACES UPDATED" micro-chip on
  every `updateBuilder()`/`refreshDanielsTable()` run.

### Major
- **M1 — Hero not editable (Alex's #1 ask).** Make `#build-rep` an inline styled select
  (replacing the lower `pcRep`) and `#build-time` click-to-edit (back-solves intensity %
  from the anchor, snaps the slider). Dotted-underline/pencil hover affordance.
- **M2 — Group/generic mode has no information scent.** Add "Athlete | Quick paces" tabs
  at the top of the screen; "Quick paces" reuses `renderFreeTierCalculator()` inside the
  workspace shell (exposure, not construction). Cross-link from the Current Fitness card:
  "Not about this athlete? Quick paces →". Covers "2:45 800s for 10 kids".
- **M3 — Split-table rows read as race predictions.** Race Pace row shows 5K 17:17.5 for
  an athlete whose entered 5K PR is 19:45 — an educated coach stops trusting everything.
  The full flat-% grid is doctrine (deliberate, 2026-08-17); keep it, but label it at the
  point of reading: these are even-split *workout targets at a % of anchor race speed*,
  not predicted race times; add a footnote when an entered PR at that distance disagrees
  materially ("her actual 5K PR is 19:45 — see Race Forecasts for predictions").
- **M4 — Heat adjustment output speaks jargon at a safety moment.** Replace visible
  `CONDITIONS APPLIED · +13.0% · EVIDENCE 85/100 (HEURISTIC)` with plain English:
  "It's hot — plan ~13% slower (≈20s per 400m)". Citations (Ely 2007 etc.) and the
  evidence score move to a footnote/tooltip. Same for the RE3 copy.
- **M5 — No single primary object above the fold.** Order should be: context strip →
  hero → controls → banners/override → table. Youth banner + Current Fitness card
  currently push the answer ~800px down; collapse Current Fitness to one line when no
  override is active. Six same-styled buttons compete; the only saturated-orange CTAs on
  the page are monetization (Sign in / Upgrade), so visual weight points away from the
  coach's task.
- **M6 — Label hierarchy collapse.** ~15 uses of the same mono-uppercase micro-label
  token for section headers, field labels, kickers, footnotes. Three tiers: sentence-case
  semibold section headers (the "Predictive Race Times" style, already on the page);
  mono-uppercase only for field labels/data captions; normal-case footnotes.
- **M7 — Guardrail is qualitative-only.** Conservative/Standard/Aggressive never shows
  the numeric effect before committing. Show the delta per setting (e.g. "Easy 7:31 →
  7:09/mi") in the chooser.
- **M8 — Stacked adjustments are undisclosed at the hero.** With fitness override +
  conditions both active, the hero shows one number with no marker; the two badges are
  scroll-separated. Put a small yellow "adjusted" chip inside the hero card naming both
  factors and their contributions.

### Minor
- Disabled preset pills render as bare "—" with no reason; keep the label + tooltip
  ("Softened by youth guardrail" / "needs 1500m+ PR").
- Three adjacent controls named "Adjust…" (paces / guardrail / intensity) do unrelated
  things — rename override CTA to "Set current fitness".
- `17:00` placeholder in the fitness card reads as a pre-filled value (HS athlete thought
  it was an error/someone else's number). Clearer placeholder styling.
- Tenth-of-a-second splits ("1:28.8") are uncallable at a track; offer whole-second
  rounding (or round by default below 3K reps).
- Two different disclosure patterns (`details` cards with `+` vs underlined fake-link
  Advanced Settings vs the SHOW THE MATH kicker) — unify on the `details` card, rotate
  `+`→`−` when open.
- Highlight the split-table column matching the selected rep distance; dim the rest.
- "Prescription" reads clinical to athletes; HS persona wanted one plain line under the
  hero: "This is your rep pace at full race effort — nothing below is required."
- 800m-anchor athletes see aerobic rows dashed ("Needs 1500m+ PR") even when a 1600/5K
  additional PR exists on the profile — the anchor never auto-switches. At minimum the
  dash reason should say "using her 1600m PR fixes this" (verify intended behavior).

### Persona claim that did NOT survive verification
- Volunteer-coach reviewer claimed the Rep distance dropdown is "hidden behind the
  collapsed SHOW THE MATH toggle." False — the controls card is always visible
  (index.html:9339). The real issue is M1's disconnection, not concealment.

## Sequenced fix plan (UI analyst's estimates)
1. **B1+B2** — delete Recalculate, add change-flash feedback (~2–4 h). Kills the trust
   problem cheapest.
2. **M1** — editable hero (~1–2 d).
3. **M2** — Quick-paces tab for signed-in coaches (~0.5–1 d).
4. **M5+M6+minor consistency** — hierarchy/reorder/type-tier pass, mostly CSS (~1 d).
5. **M3, M4, M7, M8** — copy + labeling honesty pass (~1 d).
