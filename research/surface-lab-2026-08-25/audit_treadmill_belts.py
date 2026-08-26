#!/usr/bin/env python3
"""Final QA for normalized treadmill endless-belt circumference records."""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "treadmill_belt_circumferences.csv"
OUTPUT = ROOT / "treadmill_belt_circumferences_validated.csv"
QA = ROOT / "treadmill_belt_quality_report.json"
FIGURE = ROOT / "treadmill_belt_brand_ranges.png"

EXPECTED_BRANDS = {
    "Life Fitness", "Precor", "Matrix Fitness", "Technogym", "NordicTrack",
    "ProForm", "Sole Fitness", "Horizon Fitness", "BowFlex", "Peloton",
    "Woodway", "TRUE Fitness", "Star Trac", "Landice", "Cybex",
    "Spirit Fitness", "Assault Fitness", "SportsArt", "XTERRA Fitness",
    "Sunny Health & Fitness",
}

CONFLICT_TERMS = (
    "conflict", "discrep", "another listing", "lists 130", "lists a 20x114",
    "not all", "some use", "minor variations", "different deck", "sku indicates",
)


def main() -> None:
    frame = pd.read_csv(INPUT)
    numeric = frame[frame["numeric_circumference_verified"] == True].copy()  # noqa: E712

    frame["verification_flag"] = "unavailable"
    frame["manual_confirmation_recommended"] = False
    for index, row in frame.iterrows():
        if not bool(row["numeric_circumference_verified"]):
            continue
        notes = str(row.get("compatibility_notes") or "").lower()
        conflict = any(term in notes for term in CONFLICT_TERMS)
        low_provenance = row.get("source_domain") in {"alibaba.com", "manuals.plus", "scribd.com"}
        if conflict or low_provenance:
            frame.at[index, "verification_flag"] = "numeric_with_model_or_source_conflict"
            frame.at[index, "manual_confirmation_recommended"] = True
        elif row.get("evidence_rank") == "B":
            frame.at[index, "verification_flag"] = "numeric_specialist_source"
        else:
            frame.at[index, "verification_flag"] = "numeric_retail_source"

    # Exact conversion and physical plausibility checks.
    conversion_error_mm = (numeric["circumference_in"] * 25.4 - numeric["circumference_mm"]).abs()
    width_conversion_error_mm = (numeric["width_in"] * 25.4 - numeric["width_mm"]).abs()
    plausible_range = numeric["circumference_in"].between(90, 150)
    with_surface = numeric[numeric["running_surface_length_value"].notna()].copy()
    surface_in = np.where(
        with_surface["running_surface_length_unit"].str.lower().eq("mm"),
        with_surface["running_surface_length_value"] / 25.4,
        with_surface["running_surface_length_value"],
    )
    loop_exceeds_two_surface_runs = with_surface["circumference_in"].to_numpy() > 2 * surface_in

    # Shared part numbers should not map to conflicting dimensions. Split only
    # simple exact part strings; compound alias strings remain auditable notes.
    simple_parts = numeric[
        numeric["belt_part_number"].notna()
        & ~numeric["belt_part_number"].str.contains(r"[/,]", regex=True, na=False)
    ]
    conflicts = []
    for part_number, group in simple_parts.groupby("belt_part_number"):
        values = sorted(group["circumference_mm"].round(1).unique().tolist())
        if len(values) > 1:
            conflicts.append({"belt_part_number": part_number, "circumference_mm_values": values})

    observed_brands = set(frame["brand"].dropna())
    brands_with_numeric = set(numeric["brand"].dropna())
    brand_ranges = (
        numeric.groupby("brand", as_index=False)
        .agg(
            min_in=("circumference_in", "min"),
            max_in=("circumference_in", "max"),
            records=("model_family", "count"),
        )
        .sort_values("min_in")
    )

    qa = {
        "expected_brand_count": len(EXPECTED_BRANDS),
        "observed_brand_count": len(observed_brands),
        "missing_brands": sorted(EXPECTED_BRANDS - observed_brands),
        "brands_with_numeric_circumference": len(brands_with_numeric),
        "brands_without_numeric_circumference": sorted(EXPECTED_BRANDS - brands_with_numeric),
        "model_family_records": int(len(frame)),
        "numeric_records": int(len(numeric)),
        "unavailable_records": int((frame["verification_flag"] == "unavailable").sum()),
        "manual_confirmation_records": int(frame["manual_confirmation_recommended"].sum()),
        "max_circumference_conversion_error_mm": float(conversion_error_mm.max()),
        "max_width_conversion_error_mm": float(width_conversion_error_mm.dropna().max()),
        "all_numeric_circumferences_within_90_to_150_in": bool(plausible_range.all()),
        "all_loops_exceed_twice_reported_running_surface": bool(loop_exceeds_two_surface_runs.all()),
        "shared_simple_part_number_conflicts": conflicts,
        "official_manufacturer_numeric_records": int((numeric["evidence_rank"] == "A").sum()),
        "warning": "No retained numeric record is hosted on an official manufacturer domain; values are dimensioned compatible/OEM replacement records or mirrored documentation.",
    }
    QA.write_text(json.dumps(qa, indent=2), encoding="utf-8")
    frame.to_csv(OUTPUT, index=False)

    plt.style.use("seaborn-v0_8-whitegrid")
    plt.rcParams.update({"font.family": "DejaVu Sans", "axes.titleweight": "bold"})
    fig_height = max(6.5, len(brand_ranges) * 0.42)
    fig, ax = plt.subplots(figsize=(10.5, fig_height))
    y = np.arange(len(brand_ranges))
    ax.hlines(y, brand_ranges["min_in"], brand_ranges["max_in"], color="#9fb3c0", linewidth=5, zorder=1)
    ax.scatter(brand_ranges["min_in"], y, color="#12b8d4", s=42, label="Smallest verified family", zorder=2)
    ax.scatter(brand_ranges["max_in"], y, color="#2f6bff", s=42, label="Largest verified family", zorder=2)
    ax.set_yticks(y, brand_ranges["brand"])
    ax.set_xlabel("Endless-belt circumference (inches)")
    fig.suptitle("Verified replacement-belt circumference ranges by brand", y=0.985, fontsize=17, fontweight="bold")
    fig.text(
        0.5,
        0.012,
        "Model-specific replacement records only · slat-belt brands without authoritative loop lengths omitted",
        ha="center",
        color="#526675",
        fontsize=9,
    )
    ax.legend(frameon=False, loc="lower right")
    ax.invert_yaxis()
    fig.tight_layout(rect=(0, 0.045, 1, 0.945))
    fig.savefig(FIGURE, dpi=200, bbox_inches="tight")
    plt.close(fig)

    print(json.dumps(qa, indent=2))


if __name__ == "__main__":
    main()
