from __future__ import annotations

from datetime import date

import pytest

from fitFlow.backend.app.models.client import ActivityLevel, Goal
from fitFlow.backend.app.models.user import Sex
from fitFlow.backend.app.services.nutrition_analysis import NutritionAnalysisService
from fitFlow.backend.app.services.nutrition_calculator import (
    SportNutritionCalculator,
    StandardNutritionCalculator,
)
from fitFlow.backend.app.services.plan_factory import (
    NutritionPlanFactory,
    SimplePlanGenerator,
    SportPlanGenerator,
)


@pytest.mark.parametrize(
    ("sex", "goal", "expected_shift"),
    [
        (Sex.Masculino, Goal.Bajar_Peso, -500),
        (Sex.Femenino, Goal.Subir_Peso, 300),
        (Sex.Masculino, Goal.Mantener_Peso, 0),
    ],
)
def test_standard_calculator_daily_requirements(client_factory, sex, goal, expected_shift):
    client = client_factory(sex=sex, goal=goal)
    calculator = StandardNutritionCalculator()

    requirements = calculator.calculate_daily_requirements(client)

    assert requirements["target_calories"] == requirements["rcde"]
    assert requirements["rcde"] == pytest.approx(requirements["tdee"] + expected_shift)
    assert requirements["bmr"] > 0


@pytest.mark.parametrize(
    ("goal", "protein_ratio", "carbs_ratio", "fat_ratio"),
    [
        (Goal.Subir_Peso, 0.25, 0.45, 0.30),
        (Goal.Bajar_Peso, 0.30, 0.40, 0.30),
        (Goal.Mantener_Peso, 0.20, 0.50, 0.30),
    ],
)
def test_standard_calculator_macronutrients(client_factory, goal, protein_ratio, carbs_ratio, fat_ratio):
    client = client_factory(goal=goal)
    calculator = StandardNutritionCalculator()
    rcde = client.calculate_RCDE()

    macros = calculator.calculate_macronutrients(client)

    assert macros["protein_kcal"] == pytest.approx(round(rcde * protein_ratio, 1))
    assert macros["carbs_kcal"] == pytest.approx(round(rcde * carbs_ratio, 1))
    assert macros["fat_kcal"] == pytest.approx(round(rcde * fat_ratio, 1))


@pytest.mark.parametrize(
    ("sex", "activity", "goal", "expected_goal_shift"),
    [
        (Sex.Masculino, ActivityLevel.Extremo, Goal.Subir_Peso, 500),
        (Sex.Femenino, ActivityLevel.Sedentario, Goal.Bajar_Peso, -300),
        (Sex.Masculino, ActivityLevel.Ligero, Goal.Mantener_Peso, 0),
    ],
)
def test_sport_calculator_daily_requirements(client_factory, sex, activity, goal, expected_goal_shift):
    client = client_factory(sex=sex, activity_level=activity, goal=goal)
    calculator = SportNutritionCalculator()

    requirements = calculator.calculate_daily_requirements(client)

    assert requirements["rcde"] == pytest.approx(requirements["tdee"] + expected_goal_shift)
    assert requirements["target_calories"] == requirements["rcde"]


@pytest.mark.parametrize(
    ("goal", "protein_ratio", "carbs_ratio", "fat_ratio"),
    [
        (Goal.Subir_Peso, 0.30, 0.45, 0.25),
        (Goal.Bajar_Peso, 0.35, 0.35, 0.30),
        (Goal.Mantener_Peso, 0.25, 0.50, 0.25),
    ],
)
def test_sport_calculator_macronutrients(client_factory, goal, protein_ratio, carbs_ratio, fat_ratio):
    client = client_factory(goal=goal)
    calculator = SportNutritionCalculator()
    rcde = client.calculate_RCDE()

    macros = calculator.calculate_macronutrients(client)

    assert macros["protein_kcal"] == pytest.approx(round(rcde * protein_ratio, 1))
    assert macros["carbs_kcal"] == pytest.approx(round(rcde * carbs_ratio, 1))
    assert macros["fat_kcal"] == pytest.approx(round(rcde * fat_ratio, 1))


def test_plan_factory_creates_generators_and_lists_available_types():
    factory = NutritionPlanFactory()
    calculator = StandardNutritionCalculator()

    assert isinstance(factory.create_plan_generator("simple", calculator), SimplePlanGenerator)
    assert isinstance(factory.create_plan_generator("sport", calculator), SportPlanGenerator)
    assert [item["type"] for item in factory.get_available_types()] == ["simple", "sport"]


def test_plan_factory_rejects_unknown_type():
    with pytest.raises(ValueError, match="Tipo de plan no soportado"):
        NutritionPlanFactory().create_plan_generator("unknown", StandardNutritionCalculator())


def test_simple_plan_generator_distributes_calories(client_factory):
    plan = SimplePlanGenerator(StandardNutritionCalculator()).generate_plan(
        client_factory(), date(2026, 7, 13)
    )

    assert plan["type"] == "simple"
    assert len(plan["meals"]) == 4
    assert sum(meal["percentage"] for meal in plan["meals"]) == 100
    assert sum(meal["target_calories"] for meal in plan["meals"]) == pytest.approx(
        plan["target_calories"], abs=0.2
    )
    assert "nutritional_info" in plan


def test_sport_plan_generator_adds_meal_focus_and_notes(client_factory):
    plan = SportPlanGenerator(SportNutritionCalculator()).generate_plan(
        client_factory(), date(2026, 7, 13)
    )

    assert plan["type"] == "sport"
    assert len(plan["meals"]) == 5
    assert all("focus" in meal for meal in plan["meals"])
    assert plan["sport_notes"]


@pytest.mark.parametrize(
    ("weight", "goal", "activity", "expected_status", "timeline"),
    [
        (50, Goal.Subir_Peso, ActivityLevel.Sedentario, "bajo_peso", "largo_plazo"),
        (70, Goal.Mantener_Peso, ActivityLevel.Moderado, "normal", "corto_plazo"),
        (95, Goal.Bajar_Peso, ActivityLevel.Extremo, "obesidad", "largo_plazo"),
    ],
)
def test_analysis_service_returns_complete_analysis(
    client_factory, weight, goal, activity, expected_status, timeline
):
    client = client_factory(
        current_weight=weight,
        goal_weight=70,
        goal=goal,
        activity_level=activity,
    )
    analysis = NutritionAnalysisService(StandardNutritionCalculator()).analyze_client_nutrition(client)

    assert set(analysis) == {
        "daily_requirements",
        "macronutrient_targets",
        "bmi_analysis",
        "goal_analysis",
        "recommendations",
    }
    assert analysis["bmi_analysis"]["status"] == expected_status
    assert analysis["goal_analysis"]["timeline_category"] == timeline
    assert analysis["recommendations"]


def test_analysis_service_covers_overweight_and_medium_timeline(client_factory):
    client = client_factory(
        current_weight=78,
        goal_weight=68,
        goal=Goal.Bajar_Peso,
        activity_level=ActivityLevel.Ligero,
    )
    service = NutritionAnalysisService(StandardNutritionCalculator())

    analysis = service.analyze_client_nutrition(client)

    assert analysis["bmi_analysis"]["status"] == "sobrepeso"
    assert analysis["goal_analysis"]["timeline_category"] == "mediano_plazo"
