#!/usr/bin/env python3
"""Normalize and audit major-brand treadmill endless-belt records."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd


ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "treadmill_belt_parallel_raw.json"
OUTPUT = ROOT / "treadmill_belt_circumferences.csv"
COVERAGE = ROOT / "treadmill_belt_coverage.csv"
ISSUES = ROOT / "treadmill_belt_audit_issues.csv"
ACCESS_DATE = "2026-08-25"

OFFICIAL_DOMAINS = {
    "lifefitness.com",
    "precor.com",
    "matrixfitness.com",
    "technogym.com",
    "nordictrack.com",
    "proform.com",
    "soletreadmills.com",
    "horizonfitness.com",
    "bowflex.com",
    "onepeloton.com",
    "woodway.com",
    "truefitness.com",
    "corehandf.com",
    "landice.com",
    "spiritfitness.com",
    "assaultfitness.com",
    "gosportsart.com",
    "xterrafitness.com",
    "sunnyhealthfitness.com",
}


def root_domain(url: str | None) -> str | None:
    if not url:
        return None
    host = urlparse(url).netloc.lower().split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    return host


def as_text(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        return "; ".join(str(item) for item in value)
    text = str(value).strip()
    return text or None


def recalc_length(value: object, unit: object) -> tuple[float | None, float | None]:
    if value is None or unit is None:
        return None, None
    number = float(value)
    normalized = str(unit).strip().lower()
    if normalized in {"in", "inch", "inches"}:
        return number * 25.4, number
    if normalized in {"mm", "millimeter", "millimetre", "millimeters", "millimetres"}:
        return number, number / 25.4
    return None, None


def main() -> None:
    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    records: list[dict[str, object]] = []
    issues: list[dict[str, object]] = []

    for result in payload["results"]:
        output = result.get("output") or {}
        brand = output.get("brand") or result.get("input")
        raw_records = json.loads(output.get("records_json") or "[]")
        for raw in raw_records:
            status = raw.get("measurement_status") or "unavailable"
            rank = raw.get("evidence_rank") or "U"
            source_url = raw.get("source_url")
            domain = root_domain(source_url)
            notes = as_text(raw.get("compatibility_notes")) or ""

            # A manufacturer document mirrored by a third party is not Rank A
            # provenance unless the source URL itself is official.
            if rank == "A" and domain not in OFFICIAL_DOMAINS:
                issues.append(
                    {
                        "brand": brand,
                        "model_family": raw.get("model_family"),
                        "issue": "Rank A downgraded because the cited document is hosted outside the manufacturer domain.",
                        "source_url": source_url,
                    }
                )
                rank = "B"

            if status == "direct_manufacturer" and domain not in OFFICIAL_DOMAINS:
                status = "compatible_replacement"

            circumference_value = raw.get("circumference_value")
            circumference_unit = raw.get("circumference_unit")

            # The AssaultRunner result relied on an average pitch from an
            # unverified social-media demonstration. Keep the audited family
            # but reject the numeric derivation until a technical drawing is found.
            if brand == "Assault Fitness" and status == "derived_geometry":
                issues.append(
                    {
                        "brand": brand,
                        "model_family": raw.get("model_family"),
                        "issue": "Numeric slat-loop derivation rejected: slat pitch was not supported by an authoritative technical source.",
                        "source_url": source_url,
                    }
                )
                circumference_value = None
                circumference_unit = None
                status = "unavailable"
                rank = "U"
                notes = (notes + " Numeric 152.52 in derivation rejected during audit.").strip()

            circumference_mm, circumference_in = recalc_length(circumference_value, circumference_unit)
            supplied_mm = raw.get("circumference_mm")
            supplied_in = raw.get("circumference_in")
            if circumference_mm is not None and supplied_mm is not None and abs(circumference_mm - float(supplied_mm)) > 5:
                issues.append(
                    {
                        "brand": brand,
                        "model_family": raw.get("model_family"),
                        "issue": f"Supplied mm conversion differed by more than 5 mm; recalculated from original value ({supplied_mm} vs {circumference_mm:.2f}).",
                        "source_url": source_url,
                    }
                )
            if circumference_in is not None and supplied_in is not None and abs(circumference_in - float(supplied_in)) > 0.2:
                issues.append(
                    {
                        "brand": brand,
                        "model_family": raw.get("model_family"),
                        "issue": f"Supplied inch conversion differed by more than 0.2 in; recalculated ({supplied_in} vs {circumference_in:.3f}).",
                        "source_url": source_url,
                    }
                )

            width_mm, width_in = recalc_length(raw.get("width_value"), raw.get("width_unit"))
            has_numeric = circumference_mm is not None and status != "unavailable" and rank != "U"
            model_family = as_text(raw.get("model_family"))
            model_specific = bool(model_family and "unknown" not in model_family.lower())
            include_in_brand_range = bool(has_numeric and model_specific)

            confidence = {
                "A": "high",
                "B": "medium-high",
                "C": "medium",
                "D": "low",
                "U": "unavailable",
            }.get(rank, "unavailable")

            records.append(
                {
                    "brand": brand,
                    "model_family": model_family,
                    "model_examples": as_text(raw.get("model_examples")),
                    "belt_part_number": as_text(raw.get("belt_part_number")),
                    "original_dimension_text": as_text(raw.get("original_dimension_text")),
                    "width_original_value": raw.get("width_value"),
                    "width_original_unit": raw.get("width_unit"),
                    "width_mm": round(width_mm, 2) if width_mm is not None else None,
                    "width_in": round(width_in, 3) if width_in is not None else None,
                    "circumference_original_value": circumference_value,
                    "circumference_original_unit": circumference_unit,
                    "circumference_mm": round(circumference_mm, 2) if circumference_mm is not None else None,
                    "circumference_in": round(circumference_in, 3) if circumference_in is not None else None,
                    "running_surface_length_value": raw.get("running_surface_length_value"),
                    "running_surface_length_unit": raw.get("running_surface_length_unit"),
                    "measurement_status": status,
                    "evidence_rank": rank,
                    "confidence": confidence,
                    "numeric_circumference_verified": has_numeric,
                    "include_in_brand_range": include_in_brand_range,
                    "source_publisher": as_text(raw.get("source_publisher")),
                    "source_domain": domain,
                    "source_url": source_url,
                    "secondary_source_url": raw.get("secondary_source_url"),
                    "compatibility_notes": notes or None,
                    "access_date": ACCESS_DATE,
                    "running_surface_is_not_circumference": True,
                }
            )

    frame = pd.DataFrame(records)
    frame = frame.sort_values(["brand", "model_family"], na_position="last").reset_index(drop=True)
    frame.to_csv(OUTPUT, index=False)

    coverage_rows = []
    for brand, group in frame.groupby("brand", sort=True):
        usable = group[group["include_in_brand_range"]]
        coverage_rows.append(
            {
                "brand": brand,
                "model_family_records": int(len(group)),
                "numeric_model_specific_records": int(len(usable)),
                "unavailable_records": int((group["measurement_status"] == "unavailable").sum()),
                "min_circumference_in": round(float(usable["circumference_in"].min()), 3) if len(usable) else None,
                "max_circumference_in": round(float(usable["circumference_in"].max()), 3) if len(usable) else None,
                "best_evidence_rank": sorted(group["evidence_rank"].unique(), key=lambda value: "ABCDU".index(value))[0],
            }
        )
    pd.DataFrame(coverage_rows).to_csv(COVERAGE, index=False)
    pd.DataFrame(issues).to_csv(ISSUES, index=False)

    summary = {
        "brands": int(frame["brand"].nunique()),
        "model_family_records": int(len(frame)),
        "numeric_model_specific_records": int(frame["include_in_brand_range"].sum()),
        "unavailable_records": int((frame["measurement_status"] == "unavailable").sum()),
        "rank_counts": frame["evidence_rank"].value_counts().sort_index().to_dict(),
        "audit_issue_count": len(issues),
    }
    (ROOT / "treadmill_belt_dataset_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
