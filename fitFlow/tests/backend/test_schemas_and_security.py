from __future__ import annotations

from datetime import date

import pytest
from jose import jwt
from pydantic import ValidationError

from fitFlow.backend.app.core.security import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
)
from fitFlow.backend.app.core import security
from fitFlow.backend.app.models.nutrition_plan_meal import MealType
from fitFlow.backend.app.schemas.admin import AdminCreate
from fitFlow.backend.app.schemas.client import ActivityLevel, ClientCreate, Goal, Sex
from fitFlow.backend.app.schemas.food import FoodCreate, FoodOut
from fitFlow.backend.app.schemas.food_log import FoodLogCreate
from fitFlow.backend.app.schemas.nutrition_plan import NutritionPlanCreate, NutritionPlanMealCreate
from fitFlow.backend.app.schemas.nutritionist import EspecialidadNutricionista, NutritionistCreate
from fitFlow.backend.app.schemas.user import UserBase, UserLogin, UserOut
from fitFlow.backend.app.schemas.validators import validate_ecuadorian_cedula


VALID_CEDULA = "1710034065"
VALID_PASSWORD = "Strong1@"


def test_validate_ecuadorian_cedula_accepts_valid_number():
    assert validate_ecuadorian_cedula(VALID_CEDULA) == VALID_CEDULA


@pytest.mark.parametrize("cedula", ["abc", "0010034065", "1760034065", "1710034064"])
def test_validate_ecuadorian_cedula_rejects_invalid_numbers(cedula):
    with pytest.raises(ValueError):
        validate_ecuadorian_cedula(cedula)


def test_client_create_validates_password_and_cedula():
    payload = {
        "first_name": "Ana",
        "last_name": "Lopez",
        "cedula": VALID_CEDULA,
        "email": "ana@example.com",
        "password": VALID_PASSWORD,
        "birth_date": date(1994, 5, 1),
        "sex": Sex.Femenino,
        "height_cm": 165,
        "weight_current_kg": 60,
        "weight_goal_kg": 58,
        "activity_level": ActivityLevel.Moderado,
        "goal": Goal.Bajar_Peso,
    }

    client = ClientCreate(**payload)

    assert client.cedula == VALID_CEDULA
    assert client.goal == Goal.Bajar_Peso

    with pytest.raises(ValidationError):
        ClientCreate(**{**payload, "password": "weak"})

    for bad_password in ["lowercase1@", "NoNumber@", "NoSpecial1"]:
        with pytest.raises(ValidationError):
            ClientCreate(**{**payload, "password": bad_password})


def test_admin_and_nutritionist_create_validate_shared_rules():
    admin = AdminCreate(
        first_name="Root",
        last_name="Admin",
        cedula=VALID_CEDULA,
        email="admin@example.com",
        password=VALID_PASSWORD,
        birth_date=date(1990, 1, 1),
        sex=Sex.Masculino,
        department="Operaciones",
        phone_number="0999999999",
    )
    nutritionist = NutritionistCreate(
        first_name="Nutri",
        last_name="Coach",
        cedula="0926687856",
        email="nutri@example.com",
        password=VALID_PASSWORD,
        birth_date=date(1988, 1, 1),
        sex=Sex.Femenino,
        certification_number="CERT-1",
        specialty=EspecialidadNutricionista.nutricion_deportiva,
    )

    assert admin.department == "Operaciones"
    assert nutritionist.specialty == EspecialidadNutricionista.nutricion_deportiva

    for bad_password in ["short", "lowercase1@", "NoNumber@", "NoSpecial1"]:
        with pytest.raises(ValidationError):
            AdminCreate(**{**admin.model_dump(), "password": bad_password})
        with pytest.raises(ValidationError):
            NutritionistCreate(**{**nutritionist.model_dump(), "password": bad_password})


def test_food_and_food_log_schemas_validate_positive_numbers():
    food = FoodCreate(
        name="Avena",
        description="Cereal",
        calories_per_portion=120,
        protein_per_portion=4,
        fat_per_portion=2,
        carbs_per_portion=20,
        portion_unit="g",
    )
    food_out = FoodOut(food_id=1, **food.model_dump())
    log = FoodLogCreate(
        food_id=1,
        date=date(2026, 7, 13),
        meal_type=MealType.Desayuno,
        portion_size=1.5,
    )

    assert food_out.food_id == 1
    assert log.meal_type == MealType.Desayuno

    with pytest.raises(ValidationError):
        FoodCreate(**{**food.model_dump(), "calories_per_portion": 0})
    with pytest.raises(ValidationError):
        FoodLogCreate(food_id=1, date=date(2026, 7, 13), meal_type=MealType.Cena, portion_size=0)


def test_nutrition_plan_schema_rejects_past_dates_and_empty_portions():
    meal = NutritionPlanMealCreate(
        food_id=1,
        meal_type=MealType.Almuerzo,
        portion_size=2,
    )
    plan = NutritionPlanCreate(
        user_id=1,
        nutritionist_id=2,
        name="Plan saludable",
        plan_date=date(2099, 1, 1),
        meals=[meal],
    )

    assert plan.meals[0].portion_size == 2

    with pytest.raises(ValidationError):
        NutritionPlanMealCreate(food_id=1, meal_type=MealType.Cena, portion_size=0)
    with pytest.raises(ValidationError):
        NutritionPlanCreate(
            user_id=1,
            nutritionist_id=2,
            name="Plan pasado",
            plan_date=date(2000, 1, 1),
            meals=[meal],
        )


def test_user_schemas_and_security_helpers(monkeypatch):
    user = UserBase(
        first_name="Ana",
        last_name="Lopez",
        cedula="123456",
        email="ana@example.com",
        password=VALID_PASSWORD,
        birth_date=date(1994, 5, 1),
        sex=Sex.Femenino,
    )
    login = UserLogin(email="ana@example.com", password=VALID_PASSWORD)
    out = UserOut(
        user_id=1,
        first_name=user.first_name,
        last_name=user.last_name,
        cedula=user.cedula,
        email=user.email,
        birth_date=user.birth_date,
        sex=user.sex,
        role="Cliente",
    )

    class FakePasswordContext:
        def hash(self, password):
            return f"hashed:{password}"

        def verify(self, plain_password, hashed_password):
            return hashed_password == f"hashed:{plain_password}"

    monkeypatch.setattr(security, "pwd_context", FakePasswordContext())

    hashed = security.get_password_hash(login.password)
    token = create_access_token({"sub": login.email})
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert out.role == "Cliente"
    assert security.verify_password(VALID_PASSWORD, hashed)
    assert not security.verify_password("wrong", hashed)
    assert decoded["sub"] == "ana@example.com"

    with pytest.raises(ValidationError):
        UserBase(**{**user.model_dump(), "cedula": "abc"})
