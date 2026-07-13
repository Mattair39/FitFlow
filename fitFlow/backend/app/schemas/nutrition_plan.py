# En schemas/nutrition_plan.py
from datetime import date, datetime

from fitFlow.backend.app.models.nutrition_plan_meal import MealType
from pydantic import BaseModel, confloat, conlist, constr, validator


class NutritionPlanMealCreate(BaseModel):
    food_id: int
    meal_type: MealType
    portion_size: confloat(gt=0)


class NutritionPlanCreate(BaseModel):
    user_id: int
    nutritionist_id: int
    name: constr(min_length=2, max_length=100)
    description: constr(max_length=255) | None = None
    plan_date: date  # ← NUEVO: Fecha obligatoria del plan
    meals: conlist(NutritionPlanMealCreate)

    @validator('plan_date')
    def validate_plan_date(cls, v):
        # No permitir fechas en el pasado (excepto hoy)
        if v < date.today():
            raise ValueError("La fecha del plan no puede ser anterior a hoy")
        return v


class PlanMealOut(BaseModel):
    id: int
    meal_type: MealType
    portion_size: float
    food_id: int
    food_name: str


class NutritionPlanOut(BaseModel):
    plan_id: int
    name: str
    description: str | None
    plan_date: date  # ← NUEVO en salida
    created_at: datetime | None
    meals: list[PlanMealOut]

    class Config:
        from_attributes = True