# Treadmill Endless-Belt Circumference Protocol

## Measurement definition

**Belt circumference** is the total endless-loop length measured along the belt’s running direction. A replacement belt listed as `20 × 120 in` has width 20 in and circumference 120 in. It is not equivalent to a treadmill advertised with a `20 × 60 in` running surface: the exposed top run is only part of the loop, while the remaining belt wraps around the front and rear rollers and returns beneath the deck.

## Inclusion scope

The dataset covers twenty major commercial and consumer brands: Life Fitness, Precor, Matrix Fitness, Technogym, NordicTrack, ProForm, Sole Fitness, Horizon Fitness, BowFlex, Peloton, Woodway, TRUE Fitness, Star Trac, Landice, Cybex, Spirit Fitness, Assault Fitness, SportsArt, XTERRA Fitness, and Sunny Health & Fitness. The target is not every historical SKU. For each brand, collection prioritizes current flagship families and widely installed legacy chassis with serviceable replacement belts.

## Evidence hierarchy

| Rank | Source type | Permitted claim |
|---:|---|---|
| A | Manufacturer service manual, parts catalog, or official dimensioned belt record | Verified circumference for the listed model/part |
| B | OEM-authorized distributor or specialist replacement-belt manufacturer with explicit dimensions and compatibility | High-confidence compatible replacement circumference |
| C | Independent parts retailer with explicit dimensions and identifiable part/model compatibility | Provisional compatible replacement circumference |
| D | Circumference derived from roller center distance and roller diameters published in a technical drawing | Derived geometric estimate with formula and uncertainty |
| U | Only exposed running-surface dimensions or an undimensioned belt part is available | Circumference unavailable; no estimate reported |

Manufacturer marketing specifications that state only `running area`, `running surface`, `belt area`, or `deck size` are recorded separately and never promoted to circumference.

## Required row fields

Each observation records brand, model or model family, model years when known, belt part number, original width, original circumference, units, converted width in millimetres, converted circumference in millimetres and inches, advertised running-surface length where separately sourced, evidence rank, measurement status, compatibility notes, source publisher, source URL, and access date.

## Normalization rules

Exact conversion uses `1 in = 25.4 mm`. Values already given in inches and millimetres are preserved without forcing them to agree if the publisher rounded. Model aliases are consolidated only when the same replacement-belt part number or an explicit compatibility list proves shared geometry. A belt sold “to fit” a model is labeled a compatible replacement, not necessarily the original factory belt.

## Geometry for rare derived cases

If a technical source publishes equal front and rear roller diameters `D` and center-to-center separation `C`, an idealized taut-loop circumference is `L ≈ 2C + πD`. For unequal roller diameters, a standard open-belt approximation may be used, but the result remains Rank D because tensioning, crown, belt thickness, and roller wrap alter installed length. No circumference is derived from exposed running-surface length alone.

## Acceptance threshold

The final dataset must keep verified and unavailable rows together. Coverage is considered successful when each brand has at least one representative current or legacy family audited, but numeric circumference is reported only for Rank A–D evidence. Missing values are preferable to substituting deck length or doubling the exposed running area.
