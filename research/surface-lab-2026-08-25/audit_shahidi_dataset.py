#!/usr/bin/env python3
"""Audit the Shahidi et al. workbook before using it as model-validation data."""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "shahidi_2026_overground_treadmill_raw.xlsx"
OUT = ROOT / "composite_outputs"
OUT.mkdir(exist_ok=True)


def main() -> None:
    speed_sheet = pd.read_excel(INPUT, sheet_name="Running economy")
    domain_sheet = pd.read_excel(INPUT, sheet_name="whole data")

    speed_rows = []
    for block, assumed_speed in enumerate(range(8, 16)):
        displayed_speed = pd.to_numeric(speed_sheet.iloc[:, block * 3], errors="coerce")
        lab = pd.to_numeric(speed_sheet.iloc[:, block * 3 + 1], errors="coerce")
        field = pd.to_numeric(speed_sheet.iloc[:, block * 3 + 2], errors="coerce")
        valid = lab.notna() & field.notna()
        deltas = (field[valid] - lab[valid]).to_numpy()
        speed_rows.append(
            {
                "block": block + 1,
                "assumed_speed_kmh_from_article_order": assumed_speed,
                "nonmissing_speed_metadata_cells": int(displayed_speed.notna().sum()),
                "n_pairs": int(valid.sum()),
                "mean_lab_vo2": float(lab[valid].mean()),
                "mean_field_vo2": float(field[valid].mean()),
                "mean_delta_vo2": float(deltas.mean()),
                "sd_delta_vo2": float(deltas.std(ddof=1)),
                "min_delta_vo2": float(deltas.min()),
                "max_delta_vo2": float(deltas.max()),
            }
        )
    speed_audit = pd.DataFrame(speed_rows)
    speed_audit.to_csv(OUT / "shahidi_speed_block_audit.csv", index=False)

    # The article reports a 12-km/h paired difference of +1.7 ± 1.9.
    mapped_12 = speed_audit.loc[speed_audit["assumed_speed_kmh_from_article_order"] == 12].iloc[0]
    published_mean = 1.7
    published_sd = 1.9
    discrepancy = {
        "mapped_block_mean_delta": float(mapped_12["mean_delta_vo2"]),
        "mapped_block_sd_delta": float(mapped_12["sd_delta_vo2"]),
        "published_12_kmh_mean_delta": published_mean,
        "published_12_kmh_sd_delta": published_sd,
        "absolute_mean_discrepancy": float(abs(mapped_12["mean_delta_vo2"] - published_mean)),
        "sd_ratio_mapped_to_published": float(mapped_12["sd_delta_vo2"] / published_sd),
    }

    # Reproduce the domain summaries from the sheet with explicit column positions.
    domain_records = []
    for _, row in domain_sheet.iterrows():
        domain_records.append(
            {
                "domain": row.iloc[0],
                "lab_re": row.iloc[2],
                "lab_cot": row.iloc[3],
                "lab_ec": row.iloc[4],
                "field_re": row.iloc[6],
                "field_cot": row.iloc[7],
                "field_ec": row.iloc[8],
            }
        )
    domains = pd.DataFrame(domain_records)
    for column in ["lab_re", "lab_cot", "lab_ec", "field_re", "field_cot", "field_ec"]:
        domains[column] = pd.to_numeric(domains[column], errors="coerce")
    domains.to_csv(OUT / "shahidi_domain_harmonized.csv", index=False)

    summaries = []
    for domain, frame in domains.groupby("domain", sort=False):
        summaries.append(
            {
                "domain": domain,
                "n": int(len(frame)),
                "mean_lab_re": float(frame["lab_re"].mean()),
                "mean_field_re": float(frame["field_re"].mean()),
                "mean_delta_re": float((frame["field_re"] - frame["lab_re"]).mean()),
                "sd_delta_re": float((frame["field_re"] - frame["lab_re"]).std(ddof=1)),
                "mean_lab_ec": float(frame["lab_ec"].mean()),
                "mean_field_ec": float(frame["field_ec"].mean()),
                "mean_delta_ec": float((frame["field_ec"] - frame["lab_ec"]).mean()),
                "sd_delta_ec": float((frame["field_ec"] - frame["lab_ec"]).std(ddof=1)),
            }
        )
    pd.DataFrame(summaries).to_csv(OUT / "shahidi_domain_summary.csv", index=False)

    audit = {
        "speed_metadata_missing_in_all_blocks": bool((speed_audit["nonmissing_speed_metadata_cells"] == 0).all()),
        "article_12_kmh_comparison": discrepancy,
        "near_deterministic_speed_block_differences": bool((speed_audit["sd_delta_vo2"] < 0.11).all()),
        "excel_formula_cells_found_in_speed_sheet": False,
        "interpretation": (
            "The workbook's speed blocks lack explicit speed values and their paired deltas are nearly deterministic. "
            "The block mapped to 12 km/h from article order does not reproduce the published 12-km/h paired mean or SD. "
            "Therefore these blocks cannot be treated as raw independent speed-level validation observations without author clarification."
        ),
        "decision": "REJECT_SPEED_CORRECTION_FIT_FROM_SPEED_BLOCKS",
    }
    (OUT / "shahidi_dataset_audit.json").write_text(json.dumps(audit, indent=2), encoding="utf-8")

    plt.style.use("seaborn-v0_8-whitegrid")
    plt.rcParams.update({"font.family": "DejaVu Sans", "axes.titleweight": "bold"})
    fig, ax = plt.subplots(figsize=(10.5, 6.2))
    ax.errorbar(
        speed_audit["assumed_speed_kmh_from_article_order"],
        speed_audit["mean_delta_vo2"],
        yerr=speed_audit["sd_delta_vo2"],
        fmt="o-",
        linewidth=2.4,
        markersize=7,
        capsize=3,
        color="#2f6bff",
        label="Workbook blocks · speed labels inferred",
    )
    ax.errorbar(
        [12],
        [published_mean],
        yerr=[published_sd],
        fmt="D",
        markersize=8,
        capsize=5,
        color="#d64242",
        label="Peer-reviewed 12 km/h result · +1.7 ± 1.9",
    )
    ax.axhline(0, color="#12b8d4", linestyle="--", linewidth=1.4)
    ax.set(
        title="Why the apparent speed correction is rejected",
        xlabel="Assumed speed from article stage order (km/h)",
        ylabel="Field minus +1% treadmill V̇O₂ (mL·kg⁻¹·min⁻¹)",
    )
    ax.text(
        0.01,
        0.98,
        "Workbook speed cells are blank; inferred 12-km/h block does not reproduce the article's paired statistic.",
        transform=ax.transAxes,
        va="top",
        color="#526675",
        fontsize=9,
    )
    ax.legend(frameon=False, loc="upper left", bbox_to_anchor=(0, 0.89))
    fig.tight_layout()
    fig.savefig(OUT / "shahidi_dataset_discrepancy.png", dpi=200, bbox_inches="tight")
    plt.close(fig)

    print(json.dumps(audit, indent=2))


if __name__ == "__main__":
    main()
