"""Render the validated grade-model comparison as a supporting research figure."""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parent
ASSET_DIR = Path("/home/ubuntu/webdev-static-assets")


def main() -> None:
    data = json.loads((ROOT / "derived_tables.json").read_text(encoding="utf-8"))
    rows = data["chart_rows"]
    grade = [row["grade_percent"] for row in rows]
    minetti = [row["minetti_cost_ratio"] for row in rows]
    re3 = [row["re3_rate_ratio_at_3mps"] for row in rows]

    plt.style.use("default")
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.facecolor": "#f4eedf",
            "figure.facecolor": "#f4eedf",
            "axes.edgecolor": "#1c2b2c",
            "axes.labelcolor": "#1c2b2c",
            "xtick.color": "#465250",
            "ytick.color": "#465250",
            "text.color": "#1c2b2c",
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.6), dpi=180)
    ax.axvspan(-22, -14, color="#176b69", alpha=0.09, label="Moderate-decline minimum band")
    ax.axhline(1.0, color="#1c2b2c", linewidth=1.1, linestyle=(0, (4, 5)))
    ax.axvline(0.0, color="#c9c0aa", linewidth=1.0)
    ax.plot(grade, minetti, color="#f05a28", linewidth=3.2, label="Minetti cost per path metre")
    ax.plot(grade, re3, color="#176b69", linewidth=2.8, linestyle=(0, (8, 4)), label="RE3 gross rate at 3.0 m/s")
    ax.scatter([-18], [min(minetti)], s=45, color="#f05a28", zorder=5)
    ax.annotate("Minetti minimum ≈ −18%", (-18, min(minetti)), xytext=(-38, 1.35), arrowprops={"arrowstyle": "-", "color": "#f05a28"}, fontsize=10, color="#f05a28")
    ax.set_xlim(-45, 45)
    ax.set_ylim(0, 5.65)
    ax.set_xticks([-45, -30, -20, -10, 0, 10, 20, 30, 45])
    ax.set_xticklabels([f"{value:+d}%" if value else "0%" for value in [-45, -30, -20, -10, 0, 10, 20, 30, 45]])
    ax.set_xlabel("Running-surface grade (rise/run)", labelpad=12)
    ax.set_ylabel("Ratio to the same model at level grade", labelpad=12)
    ax.set_title("Grade changes energy cost and metabolic rate nonlinearly", loc="left", fontsize=19, fontweight="bold", pad=18)
    ax.text(-45, 5.72, "Two outcomes, each normalized to its own level value", fontsize=10, color="#465250")
    ax.grid(axis="y", color="#c9c0aa", alpha=0.65, linestyle=(0, (2, 6)))
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(loc="upper left", frameon=False, ncols=2, bbox_to_anchor=(0, -0.16), fontsize=10)
    fig.text(0.99, 0.02, "Models: Minetti et al. (2002); RE3 public manuscript coefficients (Looney et al., 2026)", ha="right", fontsize=8, color="#655f54")
    fig.tight_layout(rect=[0, 0.07, 1, 1])
    output = ASSET_DIR / "grade-model-comparison.png"
    fig.savefig(output, bbox_inches="tight")
    plt.close(fig)
    print(output)


if __name__ == "__main__":
    main()
