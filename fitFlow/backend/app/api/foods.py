
from fastapi import APIRouter, Depends, HTTPException
from fitFlow.backend.app.database.session import get_db
from fitFlow.backend.app.models.food import Food
from fitFlow.backend.app.schemas.food import FoodCreate, FoodOut
from sqlalchemy.orm import Session

router = APIRouter(prefix="/foods", tags=["Foods"])

@router.post("/", response_model=FoodOut)
def create_food(food: FoodCreate, db: Session = Depends(get_db)):
    existing = db.query(Food).filter(Food.name == food.name).first()
    if existing:
        raise HTTPException(400, "Este alimento ya está registrado")
    new_food = Food(
        name=food.name,
        calories_per_portion=food.calories_per_portion,
        protein_per_portion=food.protein_per_portion,
        fat_per_portion=food.fat_per_portion,
        carbs_per_portion=food.carbs_per_portion,
        portion_unit=food.portion_unit
    )
    db.add(new_food)
    db.commit()
    db.refresh(new_food)
    return new_food


@router.put("/{food_id}", response_model=FoodOut)
def update_food(food_id: int, food: FoodCreate, db: Session = Depends(get_db)):
    """Actualizar un alimento existente"""
    existing_food = db.query(Food).filter(Food.food_id == food_id).first()
    if not existing_food:
        raise HTTPException(404, "Alimento no encontrado")

    # Verificar que el nombre no esté en uso por otro alimento
    name_conflict = db.query(Food).filter(
        Food.name == food.name,
        Food.food_id != food_id  # Excluir el alimento actual
    ).first()
    if name_conflict:
        raise HTTPException(400, "Ya existe otro alimento con ese nombre")

    # Actualizar campos
    existing_food.name = food.name
    existing_food.description = food.description if hasattr(food, 'description') else existing_food.description
    existing_food.calories_per_portion = food.calories_per_portion
    existing_food.protein_per_portion = food.protein_per_portion
    existing_food.fat_per_portion = food.fat_per_portion
    existing_food.carbs_per_portion = food.carbs_per_portion
    existing_food.portion_unit = food.portion_unit

    db.commit()
    db.refresh(existing_food)
    return existing_food

@router.get("/", response_model=list[FoodOut])
def list_foods(db: Session = Depends(get_db)):
    return db.query(Food).all()

@router.delete("/{food_id}")
def delete_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(Food).filter(Food.food_id == food_id).first()
    if not food:
        raise HTTPException(404, "Alimento no encontrado")
    db.delete(food)
    db.commit()
    return {"message": "Alimento eliminado correctamente"}
