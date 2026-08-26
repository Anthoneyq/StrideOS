#!/usr/bin/env python3
"""Harmonize and validate context corrections from Shahidi et al. (2026).

This analysis deliberately fits only the difference between overground track
running and a specific calibrated +1% treadmill. It does not refit the core
speed-by-grade metabolic surface and must not be generalized to other machines,
populations, winds, surfaces, or curves without independent study-level data.
"""

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


def load_running_economy() -> pd.DataFrame:
    raw = pd.read_excel(INPUT, sheet_name="Running economy")
    records: list[dict[str, float | int]] = []
    expected_speeds = list(range(8, 16))

    # The workbook stores eight repeated three-column blocks. The displayed
    # speed cells are blank, but the article specifies consecutive stages from
    # 8 through 15 km/h, so block order is mapped to that published protocol.
    for block, speed in enumerate(expected_speeds):
        lab = pd.to_numeric(raw.iloc[:, block * 3 + 1], errors="coerce")
        field = pd.to_numeric(raw.iloc[:, block * 3 + 2], errors="coerce")
        for participant, (lab_value, field_value) in enumerate(zip(lab, field), start=1):
            if pd.isna(lab_value) or pd.isna(field_value):
                continue
            records.append(
                {
                    "study": "Shahidi_2026",
                    "participant": participant,
                    "speed_kmh": float(speed),
                    "speed_ms": float(speed / 3.6),
                    "treadmill_grade_decimal": 0.01,
                    "field_grade_decimal": 0.0,
                    "treadmill_vo2_mlkgmin": float(lab_value),
                    "field_vo2_mlkgmin": float(field_value),
                    "delta_vo2_mlkgmin": float(field_value - lab_value),
                    "field_to_treadmill_ratio": float(field_value / lab_value),
                }
            )

    data = pd.DataFrame.from_records(records)
    if len(data) != 96:
        raise ValueError(f"Expected 96 paired observations, found {len(data)}")
    return data


def design_matrix(speed_kmh: np.ndarray, family: str) -> np.ndarray:
    s = np.asarray(speed_kmh, dtype=float)
    if family == "constant":
        return np.column_stack([np.ones_like(s)])
    if family == "linear":
        return np.column_stack([np.ones_like(s), s])
    if family == "quadratic":
        return np.column_stack([np.ones_like(s), s, s**2])
    if family == "drag_balance":
        # Residual of outdoor drag (approximately cubic in speed for metabolic
        # rate) after the approximately speed-proportional +1% grade penalty.
        return np.column_stack([np.ones_like(s), s, s**3])
    raise ValueError(f"Unknown model family: {family}")


def fit_coefficients(frame: pd.DataFrame, family: str) -> np.ndarray:
    x = design_matrix(frame["speed_kmh"].to_numpy(), family)
    y = frame["delta_vo2_mlkgmin"].to_numpy()
    return np.linalg.lstsq(x, y, rcond=None)[0]


def predict(frame: pd.DataFrame, family: str, beta: np.ndarray) -> np.ndarray:
    return design_matrix(frame["speed_kmh"].to_numpy(), family) @ beta


def metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    residual = predicted - actual
    sse = float(np.sum((actual - predicted) ** 2))
    sst = float(np.sum((actual - actual.mean()) ** 2))
    return {
        "rmse_mlkgmin": float(np.sqrt(np.mean(residual**2))),
        "mae_mlkgmin": float(np.mean(np.abs(residual))),
        "bias_mlkgmin": float(np.mean(residual)),
        "r2": float(1 - sse / sst) if sst > 0 else float("nan"),
    }


def leave_one_participant_out(data: pd.DataFrame, family: str) -> tuple[pd.DataFrame, dict[str, float]]:
    parts: list[pd.DataFrame] = []
    for participant in sorted(data["participant"].unique()):
        train = data[data["participant"] != participant]
        test = data[data["participant"] == participant].copy()
        beta = fit_coefficients(train, family)
        test["predicted_delta_vo2_mlkgmin"] = predict(test, family, beta)
        test["model"] = family
        parts.append(test)
    predictions = pd.concat(parts, ignore_index=True)
    score = metrics(
        predictions["delta_vo2_mlkgmin"].to_numpy(),
        predictions["predicted_delta_vo2_mlkgmin"].to_numpy(),
    )
    return predictions, score


def bootstrap_coefficients(data: pd.DataFrame, family: str, iterations: int = 5000) -> pd.DataFrame:
    rng = np.random.default_rng(20260825)
    participants = np.array(sorted(data["participant"].unique()))
    estimates: list[np.ndarray] = []
    for _ in range(iterations):
        sampled = rng.choice(participants, size=len(participants), replace=True)
        frames = []
        for draw, participant in enumerate(sampled):
            block = data[data["participant"] == participant].copy()
            block["bootstrap_cluster"] = draw
            frames.append(block)
        estimates.append(fit_coefficients(pd.concat(frames, ignore_index=True), family))
    matrix = np.vstack(estimates)
    rows = []
    for index in range(matrix.shape[1]):
        rows.append(
            {
                "term_index": index,
                "estimate": float(fit_coefficients(data, family)[index]),
                "ci_2_5": float(np.quantile(matrix[:, index], 0.025)),
                "ci_97_5": float(np.quantile(matrix[:, index], 0.975)),
            }
        )
    return pd.DataFrame(rows)


def main() -> None:
    data = load_running_economy()
    data.to_csv(OUT / "shahidi_2026_harmonized.csv", index=False)

    baseline_predictions = np.zeros(len(data))
    all_scores = [{"model": "no_context_correction", **metrics(data["delta_vo2_mlkgmin"].to_numpy(), baseline_predictions)}]
    prediction_frames = []
    coefficient_rows = []

    for family in ["constant", "linear", "quadratic", "drag_balance"]:
        predictions, score = leave_one_participant_out(data, family)
        prediction_frames.append(predictions)
        all_scores.append({"model": family, **score})
        beta = fit_coefficients(data, family)
        for term, value in enumerate(beta):
            coefficient_rows.append({"model": family, "term_index": term, "coefficient": float(value)})

    scores = pd.DataFrame(all_scores).sort_values("rmse_mlkgmin")
    scores.to_csv(OUT / "context_model_cv_scores.csv", index=False)
    pd.concat(prediction_frames, ignore_index=True).to_csv(OUT / "context_model_lopo_predictions.csv", index=False)
    pd.DataFrame(coefficient_rows).to_csv(OUT / "context_model_coefficients.csv", index=False)

    best_family = str(scores.iloc[0]["model"])
    if best_family == "no_context_correction":
        raise RuntimeError("No candidate correction improved on the uncorrected baseline.")
    intervals = bootstrap_coefficients(data, best_family)
    intervals["model"] = best_family
    intervals.to_csv(OUT / "best_model_cluster_bootstrap.csv", index=False)

    grouped = (
        data.groupby("speed_kmh", as_index=False)
        .agg(
            mean_delta=("delta_vo2_mlkgmin", "mean"),
            sd_delta=("delta_vo2_mlkgmin", "std"),
            mean_ratio=("field_to_treadmill_ratio", "mean"),
            sd_ratio=("field_to_treadmill_ratio", "std"),
        )
    )
    grouped.to_csv(OUT / "context_speed_summary.csv", index=False)

    best_beta = fit_coefficients(data, best_family)
    curve_speed = np.linspace(8, 15, 300)
    curve = design_matrix(curve_speed, best_family) @ best_beta

    plt.style.use("seaborn-v0_8-whitegrid")
    plt.rcParams.update({"font.family": "DejaVu Sans", "axes.titleweight": "bold"})
    fig, ax = plt.subplots(figsize=(10.5, 6.2))
    for participant, frame in data.groupby("participant"):
        ax.plot(frame["speed_kmh"], frame["delta_vo2_mlkgmin"], color="#8ea6b3", alpha=0.28, linewidth=1)
    ax.errorbar(
        grouped["speed_kmh"],
        grouped["mean_delta"],
        yerr=grouped["sd_delta"],
        fmt="o",
        color="#101820",
        ecolor="#6d8290",
        capsize=3,
        label="Observed participant mean ± SD",
    )
    ax.plot(curve_speed, curve, color="#2f6bff", linewidth=3, label=f"{best_family.replace('_', ' ').title()} fit")
    ax.axhline(0, color="#12b8d4", linestyle="--", linewidth=1.5, label="No context correction")
    ax.set(
        title="Overground minus +1% treadmill oxygen cost",
        xlabel="Speed (km/h)",
        ylabel="Δ oxygen uptake (mL·kg⁻¹·min⁻¹)",
    )
    ax.text(
        0.01,
        0.98,
        "Shahidi et al. 2026 · 12 trained men · one treadmill · one 400 m track",
        transform=ax.transAxes,
        va="top",
        color="#526675",
        fontsize=9,
    )
    ax.legend(frameon=False, loc="upper left", bbox_to_anchor=(0, 0.89))
    fig.tight_layout()
    fig.savefig(OUT / "context_correction_validation.png", dpi=200, bbox_inches="tight")
    plt.close(fig)

    manifest = {
        "source": "Shahidi et al. 2026, DOI 10.1371/journal.pone.0355988",
        "data_doi": "10.5281/zenodo.17671648",
        "n_participants": int(data["participant"].nunique()),
        "n_pairs": int(len(data)),
        "speed_range_kmh": [float(data["speed_kmh"].min()), float(data["speed_kmh"].max())],
        "best_family_by_leave_one_participant_out_rmse": best_family,
        "best_coefficients_speed_kmh_basis": [float(x) for x in best_beta],
        "validation_warning": "LOPO validation is within one study and is not study-level external validation.",
    }
    (OUT / "analysis_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(scores.to_string(index=False))
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
