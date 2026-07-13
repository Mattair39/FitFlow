from datetime import date
from secrets import SystemRandom

from fastapi import APIRouter, Depends, HTTPException
from fitFlow.backend.app.api.auth import User, get_current_user
from fitFlow.backend.app.database.session import get_db
from fitFlow.backend.app.models.client import Client
from fitFlow.backend.app.models.food import Food
from fitFlow.backend.app.models.nutrition_plan import NutritionPlan
from pydantic import BaseModel
from sqlalchemy import and_
from sqlalchemy.orm import Session

router = APIRouter(prefix="/nutrition-optimizer", tags=["NutritionOptimizer"])
rng = SystemRandom()


class OptimizeRequest(BaseModel):
    user_id: int
    plan_date: date


class GeneratedMeal(BaseModel):
    food_id: int
    meal_type: str
    portion_size: float


def choose_food(candidates: list[Food], fallback: list[Food] | None = None) -> Food | None:
    options = candidates or fallback or []
    if not options:
        return None
    return rng.choice(options)


def choose_different_food(candidates: list[Food], excluded_food_ids: set[int]) -> Food | None:
    preferred = [food for food in candidates if food.food_id not in excluded_food_ids]
    return choose_food(preferred, candidates)


def portion_for(food: Food, calories: float, max_portion: float, minimum_calories: float = 1) -> float:
    calories_per_portion = max(food.calories_per_portion, minimum_calories)
    return round(min(max_portion, calories / calories_per_portion), 1)


@router.post("/generate")
def generate_simple_plan(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Genera un plan nutricional usando un algoritmo simple y directo."""

    client = db.query(Client).filter(Client.client_id == request.user_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    existing_plan = db.query(NutritionPlan).filter(
        and_(
            NutritionPlan.user_id == request.user_id,
            NutritionPlan.plan_date == request.plan_date,
        )
    ).first()
    if existing_plan:
        raise HTTPException(400, f"Ya existe un plan para la fecha {request.plan_date}")

    foods = db.query(Food).all()
    if not foods:
        raise HTTPException(404, "No hay alimentos disponibles")

    target_calories = client.calculate_RCDE()

    proteins = [
        food
        for food in foods
        if any(word in food.name.lower() for word in ["pollo", "huevo", "atun", "salmon", "queso"])
        or food.protein_per_portion > 15
    ]
    carbs = [
        food
        for food in foods
        if any(word in food.name.lower() for word in ["arroz", "avena", "pan", "pasta", "quinoa"])
        or food.carbs_per_portion > 15
    ]
    fruits = [
        food
        for food in foods
        if any(word in food.name.lower() for word in ["manzana", "platano", "naranja", "fresa"])
    ]
    vegetables = [
        food
        for food in foods
        if any(word in food.name.lower() for word in ["brocoli", "espinaca", "zanahoria", "lechuga"])
    ]
    dairy = [food for food in foods if any(word in food.name.lower() for word in ["yogur", "leche"])]

    generated_meals = []
    lunch_food_ids = set()

    breakfast_calories = target_calories * 0.25
    dairy_food = choose_food(dairy)
    if dairy_food:
        generated_meals.append(
            GeneratedMeal(
                food_id=dairy_food.food_id,
                meal_type="Desayuno",
                portion_size=portion_for(dairy_food, breakfast_calories * 0.4, 2.0),
            )
        )

    fruit_food = choose_food(fruits)
    if fruit_food:
        generated_meals.append(
            GeneratedMeal(
                food_id=fruit_food.food_id,
                meal_type="Desayuno",
                portion_size=portion_for(fruit_food, breakfast_calories * 0.3, 2.0),
            )
        )

    breakfast_carbs = [food for food in carbs if "avena" in food.name.lower() or "pan" in food.name.lower()]
    carb_food = choose_food(breakfast_carbs, carbs)
    if carb_food:
        generated_meals.append(
            GeneratedMeal(
                food_id=carb_food.food_id,
                meal_type="Desayuno",
                portion_size=portion_for(carb_food, breakfast_calories * 0.3, 1.5),
            )
        )

    lunch_calories = target_calories * 0.35
    protein_food = choose_food(proteins)
    if protein_food:
        lunch_food_ids.add(protein_food.food_id)
        generated_meals.append(
            GeneratedMeal(
                food_id=protein_food.food_id,
                meal_type="Almuerzo",
                portion_size=portion_for(protein_food, lunch_calories * 0.5, 2.0),
            )
        )

    lunch_carbs = [food for food in carbs if "arroz" in food.name.lower() or "pasta" in food.name.lower()]
    carb_food = choose_food(lunch_carbs, carbs)
    if carb_food:
        lunch_food_ids.add(carb_food.food_id)
        generated_meals.append(
            GeneratedMeal(
                food_id=carb_food.food_id,
                meal_type="Almuerzo",
                portion_size=portion_for(carb_food, lunch_calories * 0.35, 2.0),
            )
        )

    veg_food = choose_food(vegetables)
    if veg_food:
        lunch_food_ids.add(veg_food.food_id)
        generated_meals.append(
            GeneratedMeal(
                food_id=veg_food.food_id,
                meal_type="Almuerzo",
                portion_size=portion_for(veg_food, lunch_calories * 0.15, 3.0, 10),
            )
        )

    dinner_calories = target_calories * 0.30
    protein_food = choose_different_food(proteins, lunch_food_ids)
    if protein_food:
        generated_meals.append(
            GeneratedMeal(
                food_id=protein_food.food_id,
                meal_type="Cena",
                portion_size=portion_for(protein_food, dinner_calories * 0.7, 2.0),
            )
        )

    veg_food = choose_different_food(vegetables, lunch_food_ids)
    if veg_food:
        generated_meals.append(
            GeneratedMeal(
                food_id=veg_food.food_id,
                meal_type="Cena",
                portion_size=portion_for(veg_food, dinner_calories * 0.3, 3.0, 10),
            )
        )

    snack_calories = target_calories * 0.10
    snack_options = fruits + [food for food in foods if "almendra" in food.name.lower()]
    snack_food = choose_food(snack_options)
    if snack_food:
        generated_meals.append(
            GeneratedMeal(
                food_id=snack_food.food_id,
                meal_type="Snack",
                portion_size=portion_for(snack_food, snack_calories, 1.5),
            )
        )

    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0

    for meal in generated_meals:
        food = db.query(Food).filter(Food.food_id == meal.food_id).first()
        calories = food.calories_per_portion * meal.portion_size
        total_calories += calories
        total_protein += food.protein_per_portion * meal.portion_size
        total_carbs += food.carbs_per_portion * meal.portion_size
        total_fat += food.fat_per_portion * meal.portion_size

    accuracy = round((total_calories / target_calories) * 100, 1) if target_calories > 0 else 0

    return {
        "success": True,
        "plan_data": {
            "name": f"Plan Nutricional Automatico - {request.plan_date}",
            "description": (
                f"Plan generado automaticamente. Objetivo: {target_calories} kcal, "
                f"Generado: {round(total_calories)} kcal, Precision: {accuracy}%"
            ),
            "meals": [
                {
                    "food_id": meal.food_id,
                    "meal_type": meal.meal_type,
                    "portion_size": meal.portion_size,
                }
                for meal in generated_meals
            ],
        },
        "statistics": {
            "target_calories": round(target_calories),
            "generated_calories": round(total_calories),
            "accuracy_percentage": accuracy,
            "protein": round(total_protein, 1),
            "carbs": round(total_carbs, 1),
            "fat": round(total_fat, 1),
            "meal_count": len(generated_meals),
        },
    }
