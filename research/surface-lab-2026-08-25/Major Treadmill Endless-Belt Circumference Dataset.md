# Major Treadmill Endless-Belt Circumference Dataset

**Author:** Manus AI  
**Access date:** 25 August 2026

## What this dataset measures

This dataset records the **full endless-loop length** of dimensioned treadmill replacement belts. It does not treat advertised running-surface length as belt circumference. For example, a NordicTrack incline trainer may advertise a 60-inch running surface while its model-specific replacement belt is listed as 22 × 128 inches; the second number is the full loop length.[2]

The compiled CSV covers **20 major brands, 73 audited model-family records, and 49 numeric replacement-belt records**. Model-specific numeric circumference was found for 17 brands. No authoritative numeric loop length was retained for Assault Fitness, BowFlex, or Woodway; those brands remain in the dataset as explicit unavailable records rather than estimates.

> **Important:** Belt size is model-, generation-, and sometimes serial-number-specific. A brand does not have one universal circumference. Use the exact model and serial prefix before ordering a belt or calculating speed.

## Coverage by brand

| Brand | Numeric model-family records | Audited unavailable records | Verified range, inches |
|---|---:|---:|---:|
| Assault Fitness | 0 | 1 | Unavailable |
| BowFlex | 0 | 4 | Unavailable |
| Cybex | 2 | 2 | 127.0–128.0 |
| Horizon Fitness | 3 | 0 | 114.5–125.0 |
| Landice | 2 | 0 | 122.0–136.0 |
| Life Fitness | 4 | 0 | 127.0–134.5 |
| Matrix Fitness | 3 | 1 | 128.8–131.0 |
| NordicTrack | 3 | 1 | 112.0–128.0 |
| Peloton | 1 | 1 | 124.25 |
| Precor | 2 | 0 | 133.0–134.0 |
| ProForm | 3 | 2 | 104.0–123.0 |
| Sole Fitness | 5 | 1 | 116.6–126.0 |
| Spirit Fitness | 4 | 0 | 122.441–128.150 |
| SportsArt | 4 | 0 | 123.228–130.512 |
| Star Trac | 2 | 0 | 129.0 |
| Sunny Health & Fitness | 1 | 2 | 102.0 |
| TRUE Fitness | 1 model-specific record | 3 | 127.75 |
| Technogym | 3 | 2 | 129.5–130.0 |
| Woodway | 0 | 4 | Unavailable |
| XTERRA Fitness | 5 | 0 | 103.937–126.772 |

![Verified replacement-belt circumference ranges by brand](https://private-us-east-1.manuscdn.com/sessionFile/UrbnlCo4TF8p47okV72Qa9/sandbox/ZgGmed7Y8ZppalgIHdibU3-images_1787692045494_na1fn_L2hvbWUvdWJ1bnR1L3J1bm5pbmctc3VyZmFjZS1lcXVpdmFsZW5jeS1sYWIvcmVzZWFyY2gvdHJlYWRtaWxsX2JlbHRfYnJhbmRfcmFuZ2Vz.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvVXJibmxDbzRURjhwNDdva1Y3MlFhOS9zYW5kYm94L1pnR21lZDdZOFpwcGFsZ0lIZGliVTMtaW1hZ2VzXzE3ODc2OTIwNDU0OTRfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwzSjFibTVwYm1jdGMzVnlabUZqWlMxbGNYVnBkbUZzWlc1amVTMXNZV0l2Y21WelpXRnlZMmd2ZEhKbFlXUnRhV3hzWDJKbGJIUmZZbkpoYm1SZmNtRnVaMlZ6LnBuZyIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc4OTQzMDQwMH19fV19&Key-Pair-Id=K2QY5QTL8JSY6C&Signature=MEUCIEjPv42mHPEw7SA1tlh5DFRuGlnutqK9bg2MKlzwF4ndAiEAzkAPmElYgUBsh5~YSq3bkWSUwrRVlMsZlt7FEhq9c18_)

## Representative verified records

The Life Fitness 95T Elevation Series compatible belt is explicitly listed as **21.5 × 130.25 inches** and mapped to OEM part `0K65-01002-0000`.[1] NordicTrack part `351356`, covering multiple X7i/X9i/X11i/X22i incline trainers, is explicitly listed as **22 × 128 inches**.[2] Spirit CT800/CT850 OEM treadbelt `H0743255-ZZ-A3` is listed as **560 × 3255 × 2.5 mm**.[3] The older Sole F80 serial family `580881` is listed as **20 × 116.6 inches**, showing why a model name without generation or serial is insufficient.[4]

These pages describe dimensioned replacement belts, not necessarily factory metrology reports. The normalized dataset therefore labels them as `compatible_replacement` and assigns evidence Rank B or C according to source type.

## Evidence quality and audit result

No retained numeric record was hosted on an official manufacturer domain. The numeric records come from dimensioned specialist replacement-belt listings, OEM-parts distributors, general parts retailers, or mirrored service documentation. The audit found no simple shared-part-number conflicts and unit conversions agreed within 0.012 mm. All numeric loop lengths were physically plausible at 90–150 inches and exceeded twice the separately reported exposed running-surface length where both values were available.

Eight numeric records are flagged for manual confirmation because the source is a document mirror, marketplace, or because alternate listings report different dimensions. These include some Precor, Landice, Matrix, Life Fitness, Cybex, and SportsArt records. The rejected AssaultRunner value is preserved only in the audit trail: its proposed 152.52-inch slat-loop derivation relied on an unsupported average slat pitch and was removed from the validated numeric data.

| Evidence rank | Meaning in this release |
|---:|---|
| A | Official manufacturer-hosted dimensioned record; none retained |
| B | Specialist replacement-belt or OEM-parts source with explicit dimensions |
| C | General parts retailer, marketplace, or lower-certainty compatible listing |
| U | True loop circumference unavailable; running-surface length is never substituted |

## Using circumference to calibrate belt speed

If `C` is the measured belt circumference in metres and `N` complete belt revolutions occur during `t` seconds, average belt speed is:

`v = NC / t`

If belt rotation is measured in revolutions per minute:

`v = C · rpm / 60`

To express speed in km·h⁻¹:

`v_km/h = 3.6NC / t = 0.06C · rpm`

For calibration, mark one point on the belt, count multiple complete revolutions, and time them. Using 10–20 revolutions reduces stopwatch and mark-detection error. A parts-catalog circumference is useful for identification, but the installed, tensioned belt should be measured when high accuracy matters because replacement tolerances, tensioner position, belt stretch, and belt thickness can change effective loop length.

## Data dictionary

| Field | Definition |
|---|---|
| `brand` | Manufacturer or consumer brand |
| `model_family` | Consolidated family only when compatibility evidence supports grouping |
| `model_examples` | Exact models, serial families, or chassis examples from the source |
| `belt_part_number` | OEM or replacement part identifier when available |
| `original_dimension_text` | Dimension string exactly as reported |
| `width_original_value/unit` | Reported belt width and unit |
| `width_mm`, `width_in` | Deterministic converted width |
| `circumference_original_value/unit` | Reported endless-loop length and unit |
| `circumference_mm`, `circumference_in` | Deterministic converted loop length |
| `running_surface_length_value/unit` | Exposed running length where separately sourced; never used as circumference |
| `measurement_status` | `compatible_replacement` or `unavailable` in the validated release |
| `evidence_rank` | B, C, or U after provenance audit |
| `verification_flag` | Standard numeric record, record needing manual confirmation, or unavailable |
| `manual_confirmation_recommended` | `True` when source or model mapping conflicts warrant direct measurement |
| `source_url` | Primary opened source supporting the row |
| `secondary_source_url` | Cross-check or conflict source when available |
| `compatibility_notes` | Generation, serial, alias, conflict, or slat-belt limitation |
| `access_date` | Date the source record was collected |

## Limitations

This is a **representative major-brand model-family dataset**, not a catalog of every historical treadmill SKU. Replacement suppliers may alter materials or list nominal dimensions rounded for tensioning. Several current flagship products expose part numbers without dimensions. Slat-belt machines require a belt-path or chain-pitch specification rather than a conventional flat-belt measurement, and those authoritative values were not found for the audited Assault Fitness, Woodway, and Peloton Tread+ families.

For procurement or laboratory calibration, the safest workflow is to identify the exact model and serial, verify the part number, then measure the installed loop or time multiple revolutions. The CSV is designed to narrow the search and prevent the common error of treating `20 × 60 in` as a 60-inch circumference.

## References

[1]: https://www.fitnessgraphics.com/products/life-fitness-elevation-series-treadmill-running-belt "Life Fitness Compatible Treadmill Running Belt 21.5 × 130.25"
[2]: https://fitnessdoctor.com.au/products/nordictrack-treadmill-walking-belt-351356 "NordicTrack Treadmill Walking Belt 351356 — 22 × 128"
[3]: https://hydrafitnessparts.com/products/spirit-fitness-treadmill-oem-running-treadbelt-560-x-3255-x-2-5mm-h0743255-zz-a3 "Spirit OEM Running Treadbelt 560 × 3255 × 2.5 mm"
[4]: https://www.treadmilldoctor.com/sole-f80-walking-belt-20-x-116-6-tmd-part-000951-v1 "Sole F80 Walking Belt 20 × 116.6"
