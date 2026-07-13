from __future__ import annotations

from datetime import date

import pytest

from fitFlow.backend.app.models import admin as _admin
from fitFlow.backend.app.models import food as _food
from fitFlow.backend.app.models import food_log as _food_log
from fitFlow.backend.app.models import nutrition_plan as _nutrition_plan
from fitFlow.backend.app.models import nutritionist as _nutritionist
from fitFlow.backend.app.models.client import ActivityLevel, Client, Goal
from fitFlow.backend.app.models.user import Sex, User

_ = (_admin, _food, _food_log, _nutrition_plan, _nutritionist)


def make_user(sex: Sex = Sex.Masculino, birth_year: int = 1990) -> User:
    return User(
        user_id=1,
        first_name="Alex",
        last_name="Fit",
        cedula="1710034065",
        email="alex@example.com",
        password="hashed",
        birth_date=date(birth_year, 1, 1),
        sex=sex,
    )


def make_client(
    *,
    sex: Sex = Sex.Masculino,
    activity_level: ActivityLevel = ActivityLevel.Moderado,
    goal: Goal = Goal.Mantener_Peso,
    current_weight: float = 70.0,
    goal_weight: float = 70.0,
    height: float = 175.0,
) -> Client:
    client = Client(
        client_id=1,
        height_cm=height,
        weight_current_kg=current_weight,
        weight_goal_kg=goal_weight,
        activity_level=activity_level,
        goal=goal,
    )
    client.user = make_user(sex=sex)
    return client


@pytest.fixture
def client_factory():
    return make_client
