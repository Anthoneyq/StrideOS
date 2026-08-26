# Research & reference materials

Working notes, datasets, transcripts, and exports that support STRIDE OS development. Not part of the deployed application.

## Layout

| Folder | Contents |
|--------|----------|
| `transcripts/` | Meeting and interview recordings (`.vtt`) |
| `pdfs/` | Screenshots, onboarding guides, product walkthroughs (Doug Framke critique series: `doug-framke-strideos-critique-01` … `04`) |
| `markdown/` | Research write-ups, dataset documentation, scraped references |
| `surface-lab-2026-08-25/` | Running Surface Equivalency Lab — independent grade/surface research build, archived verbatim (see below) |
| `data/` | CSV datasets (UIL, NCAA, Milesplit, masters, combined exports) |

## `surface-lab-2026-08-25/` — grade & surface research build

An independent research build (front-end + literature sweep + analysis scripts) that tried to
fit a **new** universal running-surface formula and concluded one is not yet defensible.
Archived whole rather than cherry-picked, because the negative result is the valuable part.

What was taken from it is summarised in **`GRADE-MODEL-EVIDENCE-2026-08-26.md`** at the repo
root. Read that first; do not re-derive from these files.

Load-bearing files:

| File | Why it matters |
|---|---|
| `lemire_model_benchmark_scores.csv` | RE3 vs Minetti vs HTK vs ACSM head-to-head. The reason RE3 is the core model. Read its caveats in the evidence doc — the benchmark is *not* independent. |
| `grade_equivalency_table.csv` | Independently computed RE3/Minetti/HTK table. `tests/grade-model-probes.mjs` pins the live model against it. **Do not edit** — a regression fixture is only worth having if it is external. |
| `Can We Build a More Accurate Running-Surface Formula?.md` | The negative result, with the rejected candidate and why it was rejected. |
| `model_derivations.md` | Clean derivations for grade geometry, the three models, drag, and track geometry. |

⚠️ `shahidi_2026_overground_treadmill_raw.xlsx` (and the Zenodo dataset behind it) **failed
reproduction** — its speed blocks do not reproduce the published article statistic. STRIDE
cites the article, never the workbook. Do not build on this file.

The `Home.tsx` / `index.css` / `index.html` front-end is kept for reference only. It is an
incomplete export (no `package.json`, no `main.tsx`, no `components/ui/`, and four images that
lived on external storage) and was deliberately not rebuilt or deployed.

## Market / positioning synthesis

- `docs/planning/MARKET_POSITIONING_BRIEF_2026-07-02.md` — distilled internal strategy from the Manus competitive research package. Use this instead of pasting raw competitor claims into public copy.

## CSV files (`data/`)

| File | Description |
|------|-------------|
| `all_athletes_combined.csv` | Combined HS/MS athlete results |
| `all_results_combined.csv` | Combined college + masters results |
| `elite_career_arcs.csv` | Elite career trajectory sample |
| `hs_to_college_pipeline.csv` | HS → college pipeline records |
| `master_longitudinal_dataset.csv` | Unified lifespan performance dataset |
| `milesplit_hs_results.csv` / `milesplit_ms_results.csv` | Milesplit HS and MS results |
| `ncaa_track_results.csv` / `ncaa_xc_results.csv` | NCAA championship results |
| `masters_track_results.csv` / `masters_road_results.csv` | Masters track and road |
| `uil_all_results.csv` | UIL combined export |
| `uil_state_track_2024.csv` / `uil_state_track_2025.csv` / `uil_state_track_2025_3A_4A.csv` | UIL state track by year/class |
| `uil_state_xc_2023.csv` / `uil_state_xc_2024.csv` | UIL state cross country |

Dataset docs in `markdown/` refer to filenames above; paths are relative to `research/data/`.

## Transcripts (`transcripts/`)

- `GMT20260520-170026_Recording.transcript.vtt` — May 20, 2026 recording
- `Stride OS Critique - Alex Muntefering - SD College distance coach.vtt` — product critique session
