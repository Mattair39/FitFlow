from __future__ import annotations

from datetime import date
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from fitFlow.backend.app.models.admin import Admin
from fitFlow.backend.app.models.food import Food
from fitFlow.backend.app.models.food_log import FoodLog
from fitFlow.backend.app.models.nutrition_plan import NutritionPlan
from fitFlow.backend.app.models.nutrition_plan_meal import MealType, NutritionPlanMeal
from fitFlow.backend.app.models.nutritionist import Nutritionist
from fitFlow.backend.app.services import user_service


def test_simple_sqlalchemy_models_store_constructor_values():
    food = Food(
        food_id=1,
        name="Arroz",
        description="Integral",
        calories_per_portion=110,
        protein_per_portion=2.6,
        fat_per_portion=0.9,
        carbs_per_portion=23,
        portion_unit="g",
    )
    admin = Admin(admin_id=1, department="Soporte", phone_number="0999999999")
    nutritionist = Nutritionist(
        nutritionist_id=2,
        certification_number="CERT-2",
        specialty="Nutricion deportiva",
    )
    plan = NutritionPlan(
        plan_id=1,
        user_id=1,
        nutritionist_id=2,
        name="Plan lunes",
        description="Base",
        plan_date=date(2026, 7, 13),
    )
    meal = NutritionPlanMeal(
        id=1,
        plan_id=1,
        food_id=1,
        meal_type=MealType.Almuerzo,
        portion_size=2,
    )
    log = FoodLog(
        log_id=1,
        user_id=1,
        food_id=1,
        date=date(2026, 7, 13),
        meal_type=MealType.Cena,
        portion_size=1,
    )

    assert food.name == "Arroz"
    assert admin.department == "Soporte"
    assert nutritionist.certification_number == "CERT-2"
    assert plan.plan_date == date(2026, 7, 13)
    assert meal.meal_type == MealType.Almuerzo
    assert log.portion_size == 1


class QueryStub:
    def __init__(self, existing):
        self.existing = existing
        self.filtered_by = None

    def filter(self, expression):
        self.filtered_by = expression
        return self

    def first(self):
        return self.existing


class DbStub:
    def __init__(self, existing=None):
        self.query_stub = QueryStub(existing)
        self.added = None
        self.committed = False
        self.refreshed = None

    def query(self, model):
        self.model = model
        return self.query_stub

    def add(self, value):
        self.added = value

    def commit(self):
        self.committed = True

    def refresh(self, value):
        self.refreshed = value


def test_register_user_rejects_duplicate_cedula():
    with pytest.raises(HTTPException) as exc_info:
        user_service.register_user(SimpleNamespace(cedula="1710034065"), DbStub(existing=object()))

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Cedula already registered"


def test_register_user_hashes_and_persists_new_user(monkeypatch):
    class FakeUser:
        cedula = "cedula"

        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

        def calculate_RCDE(self, goal):
            self.received_goal = goal
            return 2200

    monkeypatch.setattr(user_service, "User", FakeUser)
    monkeypatch.setattr(user_service, "get_password_hash", lambda password: f"hashed:{password}")
    db = DbStub()
    payload = SimpleNamespace(
        first_name="Ana",
        last_name="Lopez",
        cedula="1710034065",
        password="Strong1@",
        birth_date=date(1994, 5, 1),
        sex="Femenino",
        height_cm=165,
        weight_current_kg=60,
        weight_goal_kg=58,
        activity_level="Moderado",
        role_id=3,
    )

    created = user_service.register_user(payload, db)

    assert created.hashed_password == "hashed:Strong1@"
    assert created.rcde_kcal_per_day == 2200
    assert db.added is created
    assert db.committed is True
    assert db.refreshed is created
