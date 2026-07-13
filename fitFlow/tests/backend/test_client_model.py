from __future__ import annotations

import pytest
from fitFlow.backend.app.models.client import ActivityLevel, Goal
from fitFlow.backend.app.models.user import Sex


def test_client_calculates_age_and_energy_metrics(client_factory):
    client = client_factory(
        sex=Sex.Masculino,
        activity_level=ActivityLevel.Moderado,
        goal=Goal.Mantener_Peso,
        current_weight=70,
        goal_weight=70,
        height=175,
    )

    age = client.calculate_age()
    bmr = client.calculate_metabolismo_basal()
    get = client.calculate_GET()

    assert age >= 35
    assert bmr == pytest.approx(10 * 70 + 6.25 * 175 - 5 * age + 5)
    assert get == pytest.approx(bmr * 1.55)
    assert client.calculate_RCDE() == pytest.approx(get)


@pytest.mark.parametrize(
    ("goal", "expected_delta", "weeks"),
    [
        (Goal.Bajar_Peso, -500, 20),
        (Goal.Subir_Peso, 300, 33.333333),
        (Goal.Mantener_Peso, 0, 0),
    ],
)
def test_client_goal_adjustments(client_factory, goal, expected_delta, weeks):
    target_weight = 60 if goal == Goal.Bajar_Peso else 80
    client = client_factory(goal=goal, current_weight=70, goal_weight=target_weight)

    assert client.calculate_RCDE() == pytest.approx(client.calculate_GET() + expected_delta)
    assert client.estimate_weeks_to_goal() == pytest.approx(weeks)


@pytest.mark.parametrize(
    ("height", "weight", "category"),
    [
        (175, 55, "Bajo peso"),
        (175, 70, "Peso normal"),
        (175, 82, "Sobrepeso"),
        (175, 95, "Obesidad"),
    ],
)
def test_client_bmi_categories(client_factory, height, weight, category):
    client = client_factory(height=height, current_weight=weight)

    assert client.get_bmi_category() == category


@pytest.mark.parametrize(
    ("goal", "exercise_calories"),
    [
        (Goal.Bajar_Peso, 200),
        (Goal.Subir_Peso, 150),
        (Goal.Mantener_Peso, 250),
    ],
)
def test_client_recommended_exercise_by_goal(client_factory, goal, exercise_calories):
    client = client_factory(goal=goal)

    assert client.calculate_recommended_exercise_calories() == exercise_calories


def test_client_macronutrient_targets_for_weight_gain(client_factory):
    client = client_factory(goal=Goal.Subir_Peso)
    targets = client.get_macronutrient_targets()

    assert targets["protein_g"] == pytest.approx(targets["protein_kcal"] / 4)
    assert targets["carbs_g"] == pytest.approx(targets["carbs_kcal"] / 4)
    assert targets["fat_g"] == pytest.approx(targets["fat_kcal"] / 9)
    assert targets["protein_kcal"] == pytest.approx(client.calculate_RCDE() * 0.25)


def test_client_macronutrient_targets_for_balanced_goal(client_factory):
    client = client_factory(goal=Goal.Mantener_Peso)
    targets = client.get_macronutrient_targets()

    assert targets["protein_kcal"] == pytest.approx(client.calculate_RCDE() * 0.20)
    assert targets["carbs_kcal"] == pytest.approx(client.calculate_RCDE() * 0.50)


def test_client_progress_is_complete_when_current_weight_matches_goal(client_factory):
    client = client_factory(current_weight=70, goal_weight=70)

    assert client.calculate_progress_percentage() == 100.0


def test_client_progress_placeholder_returns_zero_before_history_exists(client_factory):
    client = client_factory(current_weight=70, goal_weight=65)

    assert client.calculate_progress_percentage() == 0.0


def test_client_uses_female_bmr_formula(client_factory):
    client = client_factory(sex=Sex.Femenino, current_weight=60, height=165)
    age = client.calculate_age()

    assert client.calculate_metabolismo_basal() == pytest.approx(10 * 60 + 6.25 * 165 - 5 * age - 161)
