#!/usr/bin/env python3
"""Benchmark published models against Lemire et al. speed-specific curves.

Lemire group means contributed to the RE3 source database, so this is an
overlapping-source diagnostic—not external validation. The oxygen-to-energy
conversion also assumes 20.1 J per mL O2 and adds the study's mean standing
oxygen uptake of 5.0 mL/kg/min to its published net oxygen-cost curves.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from derive_models import htk_rate, minetti_cost, re3_rate


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "composite_outputs"
OUT.mkdir(exist_ok=True)
O2_J_PER_ML = 20.1
REST_VO2_MLKGMIN = 5.0
STANDING_RATE_WKG = 1.44

LEMIRE = {
    8: (199.44, 8.9189, 0.2657, -0.0024),
    10: (190.56, 8.9130, 0.2686, 0.0007),
    12: (187.80, 8.9383, 0.2639, 0.0005),
    14: (192.24, 8.9895, 0.2283, -0.00009),
}


def lemire_net_ocr(speed_kmh: float, grade_percent: float) -> float:
    a, b, c, d = LEMIRE[int(speed_kmh)]
    i = grade_percent
    return a + b * i + c * i**2 + d * i**3


def lemire_gross_rate(speed_kmh: float, grade_percent: float) -> float:
    net_vo2_rate = lemire_net_ocr(speed_kmh, grade_percent) * speed_kmh / 60.0
    return (net_vo2_rate + REST_VO2_MLKGMIN) * O2_J_PER_ML / 60.0


def acsm_rate(speed_mps: float, decimal_grade: float) -> float:
    speed_m_min = speed_mps * 60.0
    vo2_mlkgmin = 0.2 * speed_m_min + 0.9 * speed_m_min * decimal_grade + 3.5
    return vo2_mlkgmin * O2_J_PER_ML / 60.0


def feasible(speed_kmh: int, grade_percent: int) -> bool:
    if speed_kmh == 8 and grade_percent == -20:
        return False
    if speed_kmh >= 10 and grade_percent >= 20:
        return False
    if speed_kmh >= 12 and grade_percent >= 15:
        return False
    if speed_kmh >= 14 and grade_percent >= 10:
        return False
    return True


def main() -> None:
    rows = []
    for speed_kmh in [8, 10, 12, 14]:
        speed_mps = speed_kmh / 3.6
        for grade_percent in [-20, -10, -5, 0, 5, 10, 15, 20]:
            if not feasible(speed_kmh, grade_percent):
                continue
            grade = grade_percent / 100.0
            observed = lemire_gross_rate(speed_kmh, grade_percent)
            predictions = {
                "RE3": re3_rate(speed_mps, grade),
                "Minetti": STANDING_RATE_WKG + minetti_cost(grade) * speed_mps,
            }
            if grade >= 0:
                predictions["HTK"] = htk_rate(speed_mps, grade)
                predictions["ACSM"] = acsm_rate(speed_mps, grade)
            for model, predicted in predictions.items():
                rows.append(
                    {
                        "source": "Lemire_2021_published_polynomial",
                        "speed_kmh": speed_kmh,
                        "grade_percent": grade_percent,
                        "observed_proxy_wkg": observed,
                        "model": model,
                        "predicted_wkg": predicted,
                        "error_wkg": predicted - observed,
                    }
                )

    benchmark = pd.DataFrame(rows)
    benchmark.to_csv(OUT / "lemire_model_benchmark_observations.csv", index=False)
    benchmark["domain"] = np.where(
        benchmark["grade_percent"] < 0,
        "downhill",
        np.where(benchmark["grade_percent"] > 0, "uphill", "level"),
    )
    scores = (
        benchmark.groupby(["domain", "model"], as_index=False)
        .agg(
            n=("error_wkg", "size"),
            rmse_wkg=("error_wkg", lambda x: float(np.sqrt(np.mean(x**2)))),
            mae_wkg=("error_wkg", lambda x: float(np.mean(np.abs(x)))),
            bias_wkg=("error_wkg", "mean"),
        )
        .sort_values(["domain", "rmse_wkg"])
    )
    scores.to_csv(OUT / "lemire_model_benchmark_scores.csv", index=False)

    colors = {"RE3": "#2f6bff", "HTK": "#12b8d4", "Minetti": "#6d8290", "ACSM": "#d64242"}
    plt.style.use("seaborn-v0_8-whitegrid")
    plt.rcParams.update({"font.family": "DejaVu Sans", "axes.titleweight": "bold"})
    fig, axes = plt.subplots(2, 2, figsize=(12, 8.5), sharex=True, sharey=True)
    for ax, speed_kmh in zip(axes.flat, [8, 10, 12, 14]):
        frame = benchmark[benchmark["speed_kmh"] == speed_kmh]
        observed = frame[["grade_percent", "observed_proxy_wkg"]].drop_duplicates().sort_values("grade_percent")
        ax.plot(
            observed["grade_percent"],
            observed["observed_proxy_wkg"],
            color="#101820",
            marker="o",
            linewidth=2.5,
            label="Lemire published curve",
        )
        for model in ["RE3", "HTK", "Minetti", "ACSM"]:
            model_frame = frame[frame["model"] == model].sort_values("grade_percent")
            if model_frame.empty:
                continue
            ax.plot(
                model_frame["grade_percent"],
                model_frame["predicted_wkg"],
                color=colors[model],
                marker=".",
                linewidth=1.8,
                label=model,
            )
        ax.set_title(f"{speed_kmh} km/h")
        ax.axvline(0, color="#aebdc6", linewidth=1)
    for ax in axes[-1, :]:
        ax.set_xlabel("Grade (%)")
    for ax in axes[:, 0]:
        ax.set_ylabel("Gross metabolic rate proxy (W·kg⁻¹)")
    handles, labels = axes[0, 0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="lower center", ncol=5, frameon=False)
    fig.suptitle("Existing models on Lemire et al. speed–grade curves", fontsize=17, fontweight="bold")
    fig.text(
        0.5,
        0.035,
        "Overlapping-source diagnostic only · RE3 was trained partly on Lemire group means · fixed O₂ energy equivalent used",
        ha="center",
        color="#526675",
        fontsize=9,
    )
    fig.tight_layout(rect=(0, 0.08, 1, 0.95))
    fig.savefig(OUT / "lemire_model_benchmark.png", dpi=200, bbox_inches="tight")
    plt.close(fig)

    comparable_rankings = {
        domain: group.sort_values("rmse_wkg")["model"].tolist()
        for domain, group in scores.groupby("domain")
    }
    result = {
        "rankings_by_domain_on_overlapping_source_proxy": comparable_rankings,
        "scores": scores.to_dict(orient="records"),
        "warning": "Not external validation; Lemire group means contributed to RE3 and conversion assumptions add uncertainty.",
    }
    (OUT / "lemire_model_benchmark_manifest.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(scores.to_string(index=False))


if __name__ == "__main__":
    main()
