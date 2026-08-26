"""Derive transparent tables used by the Running Surface Equivalency Lab.

All calculations are deterministic and reproduce equations documented in
research/source_notes.md. Outputs are research artifacts, not prescriptions.
"""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
G0 = 9.81


def minetti_cost(decimal_grade: float) -> float:
    x = decimal_grade
    return (
        155.4 * x**5
        - 30.4 * x**4
        - 43.3 * x**3
        + 46.3 * x**2
        + 19.5 * x
        + 3.6
    )


def re3_grade_coefficient(decimal_grade: float) -> float:
    g = decimal_grade
    bracket = 1.0 - 1.133 ** (1.0 - 1.056 ** (100.0 * g + 43.0))
    return 30.43 * g * bracket


def re3_rate(speed_mps: float, decimal_grade: float) -> float:
    return (
        4.43
        + 1.51 * speed_mps
        + 0.37 * speed_mps**2
        + re3_grade_coefficient(decimal_grade) * speed_mps
    )


def htk_rate(speed_mps: float, decimal_grade: float) -> float:
    sin_theta = decimal_grade / math.sqrt(1.0 + decimal_grade**2)
    return 1.44 + speed_mps * (
        2.01 + 1.74 * math.exp(-18.24 * sin_theta) + (G0 / 0.23) * sin_theta
    )


def positive_speed_for_re3_rate(target_rate: float, decimal_grade: float) -> float | None:
    # RE3 is quadratic in speed once grade is fixed.
    a = 0.37
    b = 1.51 + re3_grade_coefficient(decimal_grade)
    c = 4.43 - target_rate
    discriminant = b * b - 4.0 * a * c
    if discriminant < 0:
        return None
    roots = [(-b + math.sqrt(discriminant)) / (2.0 * a), (-b - math.sqrt(discriminant)) / (2.0 * a)]
    positive = [root for root in roots if root > 0]
    return min(positive) if positive else None


def grade_geometry(path_distance_m: float, decimal_grade: float) -> dict[str, float]:
    angle_rad = math.atan(decimal_grade)
    return {
        "angle_deg": math.degrees(angle_rad),
        "horizontal_m": path_distance_m * math.cos(angle_rad),
        "vertical_m": path_distance_m * math.sin(angle_rad),
        "sin_theta": math.sin(angle_rad),
        "cos_theta": math.cos(angle_rad),
    }


def drag_metrics(
    speed_mps: float,
    headwind_mps: float,
    air_density: float,
    cda_m2: float,
    mass_kg: float,
) -> dict[str, float]:
    relative_air_speed = speed_mps + headwind_mps
    signed_drag_n = 0.5 * air_density * cda_m2 * relative_air_speed * abs(relative_air_speed)
    mechanical_power_w = signed_drag_n * speed_mps
    force_percent_body_weight = 100.0 * signed_drag_n / (mass_kg * G0)
    metabolic_percent_da_silva = 6.13 * force_percent_body_weight
    return {
        "relative_air_speed_mps": relative_air_speed,
        "signed_drag_n": signed_drag_n,
        "mechanical_power_w": mechanical_power_w,
        "force_percent_body_weight": force_percent_body_weight,
        "estimated_metabolic_percent_da_silva": metabolic_percent_da_silva,
    }


def r(value: float | None, digits: int = 4) -> float | None:
    return None if value is None else round(value, digits)


def main() -> None:
    grades_percent = [-45, -30, -20, -15, -10, -5, -3, -1, 0, 1, 3, 5, 8.8, 10, 15, 17.6, 20, 30, 45]
    reference_speed = 3.0
    flat_reference_speed = 4.0
    flat_minetti = minetti_cost(0.0)
    flat_re3_at_3 = re3_rate(reference_speed, 0.0)
    flat_re3_target = re3_rate(flat_reference_speed, 0.0)

    grade_rows: list[dict[str, float | int | None]] = []
    for grade_percent in grades_percent:
        grade = grade_percent / 100.0
        geometry = grade_geometry(1000.0, grade)
        minetti = minetti_cost(grade)
        re3 = re3_rate(reference_speed, grade)
        re3_cost = re3 / reference_speed
        re3_equal_rate_speed = positive_speed_for_re3_rate(flat_re3_target, grade)
        grade_rows.append(
            {
                "grade_percent": grade_percent,
                "angle_deg": r(geometry["angle_deg"], 3),
                "vertical_per_1000m_path_m": r(geometry["vertical_m"], 2),
                "horizontal_per_1000m_path_m": r(geometry["horizontal_m"], 2),
                "minetti_cost_j_kg_m": r(minetti, 4),
                "minetti_ratio_to_level": r(minetti / flat_minetti, 4),
                "minetti_flat_equivalent_m_per_1000m": r(1000.0 * minetti / flat_minetti, 1),
                "minetti_same_power_speed_from_flat_4mps": r(flat_reference_speed * flat_minetti / minetti, 3),
                "re3_rate_w_kg_at_3mps": r(re3, 4),
                "re3_cost_j_kg_m_at_3mps": r(re3_cost, 4),
                "re3_cost_ratio_to_level_at_3mps": r(re3 / flat_re3_at_3, 4),
                "re3_same_rate_speed_from_flat_4mps": r(re3_equal_rate_speed, 3),
                "htk_rate_w_kg_at_3mps": r(htk_rate(reference_speed, grade), 4) if grade >= 0 else None,
            }
        )

    # Standard 400 m track: exact official two-bend staggers from lane 1.
    official_staggers = [0.0, 7.038, 14.704, 22.370, 30.034, 37.700, 45.366, 53.032]
    lane_rows = []
    for lane, stagger in enumerate(official_staggers, start=1):
        radius_estimate = 36.8 if lane == 1 else 36.8 + (lane - 1) * 1.22
        lane_rows.append(
            {
                "lane": lane,
                "official_400m_stagger_m": stagger,
                "unstaggered_full_lap_m": r(400.0 + stagger, 3),
                "approx_running_radius_m": r(radius_estimate, 3),
                "centripetal_accel_at_5mps_m_s2": r(25.0 / radius_estimate, 4),
                "inward_lean_deg_at_5mps": r(math.degrees(math.atan((25.0 / radius_estimate) / G0)), 3),
            }
        )

    uphill_sprint_rows = []
    for grade_percent in [0, 5.2, 8.8, 17.6]:
        angle_deg = math.degrees(math.atan(grade_percent / 100.0))
        tested_linear_ratio = max(0.0, 1.0 - 0.017 * angle_deg)
        uphill_sprint_rows.append(
            {
                "grade_percent": grade_percent,
                "angle_deg": r(angle_deg, 3),
                "delaney_vmax_ratio": r(tested_linear_ratio, 4),
                "delaney_vmax_percent_change": r(100.0 * (tested_linear_ratio - 1.0), 2),
            }
        )

    sprint_acceleration_rows = []
    for acceleration in [1.0, 2.0, 3.0, 4.0, 6.42]:
        equivalent_grade = acceleration / G0
        effective_gravity_multiplier = math.sqrt(1.0 + equivalent_grade**2)
        sprint_acceleration_rows.append(
            {
                "forward_acceleration_m_s2": acceleration,
                "equivalent_grade_percent": r(100.0 * equivalent_grade, 2),
                "effective_gravity_multiplier": r(effective_gravity_multiplier, 4),
                "minetti_mapped_cost_j_kg_m": r(minetti_cost(equivalent_grade) * effective_gravity_multiplier, 3),
                "extrapolates_beyond_45pct": equivalent_grade > 0.45,
            }
        )

    example_grade = 0.05
    example_distance = 1000.0
    example_speed = 3.0
    example_mass = 70.0
    example_duration = example_distance / example_speed
    example_re3_rate = re3_rate(example_speed, example_grade)
    geometry = grade_geometry(example_distance, example_grade)
    worked_examples = {
        "one_km_at_5pct_3mps_70kg": {
            "duration_s": r(example_duration, 1),
            "vertical_gain_m": r(geometry["vertical_m"], 2),
            "horizontal_projection_m": r(geometry["horizontal_m"], 2),
            "re3_rate_w_kg": r(example_re3_rate, 3),
            "re3_gross_energy_kcal": r(example_re3_rate * example_mass * example_duration / 4184.0, 2),
            "minetti_energy_j_kg": r(minetti_cost(example_grade) * example_distance, 1),
            "minetti_flat_equivalent_distance_m": r(example_distance * minetti_cost(example_grade) / flat_minetti, 1),
        },
        "ten_km_treadmill_at_1pct_geometry": {
            "belt_path_m": 10000.0,
            "vertical_gain_m": r(grade_geometry(10000.0, 0.01)["vertical_m"], 2),
            "horizontal_projection_m": r(grade_geometry(10000.0, 0.01)["horizontal_m"], 2),
        },
        "one_km_sand_study_specific": {
            "metabolic_multiplier": 1.6,
            "firm_surface_energy_equivalent_m": 1600.0,
            "external_work_multiplier": 1.15,
        },
        "lane_8_unstaggered_10_laps": {
            "actual_distance_m": r((400.0 + official_staggers[7]) * 10.0, 2),
            "nominal_lane_1_distance_m": 4000.0,
            "extra_distance_m": r(official_staggers[7] * 10.0, 2),
        },
        "illustrative_drag_5mps_calm": drag_metrics(5.0, 0.0, 1.225, 0.50, 70.0),
    }

    # Dense chart data for smooth curves.
    chart_rows = []
    for i in range(-450, 451, 5):
        grade = i / 1000.0
        chart_rows.append(
            {
                "grade_percent": r(grade * 100.0, 1),
                "minetti_cost_ratio": r(minetti_cost(grade) / flat_minetti, 6),
                "re3_rate_ratio_at_3mps": r(re3_rate(3.0, grade) / flat_re3_at_3, 6),
                "re3_rate_w_kg_at_3mps": r(re3_rate(3.0, grade), 6),
            }
        )

    # Numerical location of the model minima for explanatory callouts.
    minetti_min = min(chart_rows, key=lambda row: row["minetti_cost_ratio"])
    re3_min = min(chart_rows, key=lambda row: row["re3_rate_ratio_at_3mps"])

    output = {
        "metadata": {
            "reference_speed_mps": reference_speed,
            "flat_reference_speed_mps": flat_reference_speed,
            "minetti_level_cost_j_kg_m": flat_minetti,
            "re3_level_rate_w_kg_at_3mps": flat_re3_at_3,
            "models_are_population_estimates": True,
        },
        "formulae": {
            "grade": "G = rise/run; grade_percent = 100G; theta = atan(G)",
            "path_geometry": "horizontal = path/sqrt(1+G^2); vertical = path*G/sqrt(1+G^2)",
            "minetti": "C(G)=155.4G^5-30.4G^4-43.3G^3+46.3G^2+19.5G+3.6",
            "re3": "Mdot=4.43+1.51S+0.37S^2+30.43SG[1-1.133^(1-1.056^(100G+43))]",
            "htk": "Mdot=1.44+S[2.01+1.74e^(-18.24sin(theta))+(9.81/0.23)sin(theta)]",
            "flat_equivalent_distance": "d_flat_eq = sum(C(G_i)*d_i)/C(0)",
            "aerodynamic_drag": "F=0.5*rho*CdA*v_rel*abs(v_rel); P=F*v_ground",
            "sprint_equivalent_grade": "ES=a_forward/g; effective_gravity=sqrt(1+ES^2)",
        },
        "grade_rows": grade_rows,
        "chart_rows": chart_rows,
        "model_minima": {"minetti": minetti_min, "re3_at_3mps": re3_min},
        "track_lanes": lane_rows,
        "uphill_sprint_rows": uphill_sprint_rows,
        "sprint_acceleration_rows": sprint_acceleration_rows,
        "worked_examples": worked_examples,
    }

    json_path = ROOT / "derived_tables.json"
    json_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

    csv_path = ROOT / "grade_equivalency_table.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(grade_rows[0].keys()))
        writer.writeheader()
        writer.writerows(grade_rows)

    assert abs(minetti_cost(0.0) - 3.6) < 1e-12
    assert abs(re3_rate(3.0, 0.0) - (4.43 + 1.51 * 3.0 + 0.37 * 9.0)) < 1e-12
    assert output["worked_examples"]["lane_8_unstaggered_10_laps"]["extra_distance_m"] == 530.32
    print(json_path)
    print(csv_path)
    print(json.dumps(output["model_minima"], indent=2))


if __name__ == "__main__":
    main()
