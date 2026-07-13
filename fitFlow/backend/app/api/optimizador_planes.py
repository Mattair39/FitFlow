import random
from datetime import date

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


class OptimizeRequest(BaseModel):
    user_id: int
    plan_date: date


class GeneratedMeal(BaseModel):
    food_id: int
    meal_type: str
    portion_size: float


@router.post("/generate")
def generate_simple_plan(
        request: OptimizeRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Genera un plan nutricional usando un algoritmo simple y directo"""

    # 1. Verificar cliente
    client = db.query(Client).filter(Client.client_id == request.user_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    # 2. Verificar plan existente
    existing_plan = db.query(NutritionPlan).filter(
        and_(
            NutritionPlan.user_id == request.user_id,
            NutritionPlan.plan_date == request.plan_date
        )
    ).first()

    if existing_plan:
        raise HTTPException(400, f"Ya existe un plan para la fecha {request.plan_date}")

    # 3. Obtener alimentos y objetivos
    foods = db.query(Food).all()
    if not foods:
        raise HTTPException(404, "No hay alimentos disponibles")

    target_calories = client.calculate_RCDE()

    # 4. ALGORITMO SIMPLE: Clasificar alimentos por heurísticas
    proteins = [f for f in foods if any(
        word in f.name.lower() for word in ['pollo', 'huevo', 'atún', 'salmón', 'queso']) or f.protein_per_portion > 15]
    carbs = [f for f in foods if any(
        word in f.name.lower() for word in ['arroz', 'avena', 'pan', 'pasta', 'quinoa']) or f.carbs_per_portion > 15]
    fruits = [f for f in foods if any(word in f.name.lower() for word in ['manzana', 'plátano', 'naranja', 'fresa'])]
    vegetables = [f for f in foods if
                  any(word in f.name.lower() for word in ['brócoli', 'espinaca', 'zanahoria', 'lechuga'])]
    dairy = [f for f in foods if any(word in f.name.lower() for word in ['yogur', 'leche'])]

    # 5. Usar semilla diferente cada vez para variación
    import time
    random.seed(int(time.time() * 1000) % 10000)

    # 6. GENERAR PLAN SIMPLE: Una estrategia directa por comida
    generated_meals = []

    # DESAYUNO (25% de calorías): Lácteo + Fruta + Carbohidrato
    breakfast_calories = target_calories * 0.25
    if dairy:
        dairy_food = random.choice(dairy)
        dairy_portion = min(2.0, breakfast_calories * 0.4 / dairy_food.calories_per_portion)
        generated_meals.append(
            GeneratedMeal(food_id=dairy_food.food_id, meal_type="Desayuno", portion_size=round(dairy_portion, 1)))

    if fruits:
        fruit_food = random.choice(fruits)
        fruit_portion = min(2.0, breakfast_calories * 0.3 / fruit_food.calories_per_portion)
        generated_meals.append(
            GeneratedMeal(food_id=fruit_food.food_id, meal_type="Desayuno", portion_size=round(fruit_portion, 1)))

    if carbs:
        carb_food = random.choice([f for f in carbs if 'avena' in f.name.lower() or 'pan' in f.name.lower()])
        if not carb_food:
            carb_food = random.choice(carbs)
        carb_portion = min(1.5, breakfast_calories * 0.3 / carb_food.calories_per_portion)
        generated_meals.append(
            GeneratedMeal(food_id=carb_food.food_id, meal_type="Desayuno", portion_size=round(carb_portion, 1)))

    # ALMUERZO (35% de calorías): Proteína + Carbohidrato + Verdura
    lunch_calories = target_calories * 0.35
    if proteins:
        protein_food = random.choice(proteins)
        protein_portion = min(2.0, lunch_calories * 0.5 / protein_food.calories_per_portion)
        generated_meals.append(
            GeneratedMeal(food_id=protein_food.food_id, meal_type="Almuerzo", portion_size=round(protein_portion, 1)))

    if carbs:
        carb_food = random.choice([f for f in carbs if 'arroz' in f.name.lower() or 'pasta' in f.name.lower()])
        if not carb_food:
            carb_food = random.choice(carbs)
        carb_portion = min(2.0, lunch_calories * 0.35 / carb_food.calories_per_portion)
        generated_meals.append(
            GeneratedMeal(food_id=carb_food.food_id, meal_type="Almuerzo", portion_size=round(carb_portion, 1)))

    if vegetables:
        veg_food = random.choice(vegetables)
        veg_portion = min(3.0, lunch_calories * 0.15 / max(veg_food.calories_per_portion, 10))
        generated_meals.append(
            GeneratedMeal(food_id=veg_food.food_id, meal_type="Almuerzo", portion_size=round(veg_portion, 1)))

    # CENA (30% de calorías): Proteína + Verdura
    dinner_calories = target_calories * 0.30
    if proteins:
        protein_food = random.choice(
            [f for f in proteins if f.food_id != generated_meals[3].food_id])  # Diferente del almuerzo
        if not protein_food:
            protein_food = random.choice(proteins)
        protein_portion = min(2.0, dinner_calories * 0.7 / protein_food.calories_per_portion)
        generated_meals.append(
            GeneratedMeal(food_id=protein_food.food_id, meal_type="Cena", portion_size=round(protein_portion, 1)))

    if vegetables:
        veg_food = random.choice(
            [f for f in vegetables if f.food_id != generated_meals[5].food_id])  # Diferente del almuerzo
        if not veg_food:
            veg_food = random.choice(vegetables)
        veg_portion = min(3.0, dinner_calories * 0.3 / max(veg_food.calories_per_portion, 10))
        generated_meals.append(
            GeneratedMeal(food_id=veg_food.food_id, meal_type="Cena", portion_size=round(veg_portion, 1)))

    # SNACK (10% de calorías): Fruta o Fruto Seco
    snack_calories = target_calories * 0.10
    snack_options = fruits + [f for f in foods if 'almendra' in f.name.lower()]
    if snack_options:
        snack_food = random.choice(snack_options)
        snack_portion = min(1.5, snack_calories / snack_food.calories_per_portion)
        generated_meals.append(
            GeneratedMeal(food_id=snack_food.food_id, meal_type="Snack", portion_size=round(snack_portion, 1)))

    # 7. Calcular estadísticas del plan generado
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

    accuracy = round((total_calories / target_calories) * 100, 1)

    return {
        "success": True,
        "plan_data": {
            "name": f"Plan Nutricional Automático - {request.plan_date}",
            "description": f"Plan generado automáticamente. Objetivo: {target_calories} kcal, Generado: {round(total_calories)} kcal, Precisión: {accuracy}%",
            "meals": [
                {
                    "food_id": meal.food_id,
                    "meal_type": meal.meal_type,
                    "portion_size": meal.portion_size
                }
                for meal in generated_meals
            ]
        },
        "statistics": {
            "target_calories": round(target_calories),
            "generated_calories": round(total_calories),
            "accuracy_percentage": accuracy,
            "protein": round(total_protein, 1),
            "carbs": round(total_carbs, 1),
            "fat": round(total_fat, 1),
            "meal_count": len(generated_meals)
        }
    }