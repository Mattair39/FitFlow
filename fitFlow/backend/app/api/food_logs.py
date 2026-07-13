from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fitFlow.backend.app.api.auth import get_current_user
from fitFlow.backend.app.database.session import get_db
from fitFlow.backend.app.models.food_log import FoodLog
from fitFlow.backend.app.models.nutrition_plan import NutritionPlan
from fitFlow.backend.app.models.nutrition_plan_meal import NutritionPlanMeal
from fitFlow.backend.app.models.user import User
from fitFlow.backend.app.schemas.food_log import FoodLogCreate
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

router = APIRouter(prefix="/food-logs", tags=["FoodLogs"])


def get_planned_amount(db: Session, user_id: int, date: str, food_id: int, meal_type: str):
    """Obtiene la cantidad planificada para una comida específica"""
    result = db.query(NutritionPlanMeal.portion_size).join(
        NutritionPlan, NutritionPlan.plan_id == NutritionPlanMeal.plan_id
    ).filter(
        NutritionPlan.user_id == user_id,
        NutritionPlan.plan_date == date,
        NutritionPlanMeal.food_id == food_id,
        NutritionPlanMeal.meal_type == meal_type
    ).scalar()

    return result or 0.0


def get_consumed_amount(db: Session, user_id: int, date: str, food_id: int, meal_type: str):
    """Calcula la cantidad ya consumida para una comida específica"""
    result = db.query(func.sum(FoodLog.portion_size)).filter(
        FoodLog.user_id == user_id,
        FoodLog.date == date,
        FoodLog.food_id == food_id,
        FoodLog.meal_type == meal_type
    ).scalar()

    return result or 0.0


@router.post("/")
def log_food(entries: list[FoodLogCreate],
             current_user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    debug_info = {
        "usuario_id": current_user.user_id,
        "num_entries": len(entries),
        "validation_results": []
    }

    try:
        # Validar todas las entradas antes de insertar
        for entry in entries:
            effective_date = entry.date if entry.date else datetime.utcnow().date()

            # Verificar que existe un plan para esta fecha
            nutrition_plan = db.query(NutritionPlan).filter(
                and_(
                    NutritionPlan.user_id == current_user.user_id,
                    NutritionPlan.plan_date == effective_date
                )
            ).first()

            if not nutrition_plan:
                raise HTTPException(
                    status_code=400,
                    detail=f"No hay plan nutricional para la fecha {effective_date}"
                )

            # Obtener cantidad planificada
            planned_amount = get_planned_amount(
                db, current_user.user_id, effective_date,
                entry.food_id, entry.meal_type
            )

            if planned_amount == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"No hay {entry.meal_type} planificado para el food_id {entry.food_id} en {effective_date}"
                )

            # Obtener cantidad ya consumida
            already_consumed = get_consumed_amount(
                db, current_user.user_id, effective_date,
                entry.food_id, entry.meal_type
            )

            # Validar que no exceda lo planificado
            total_after_entry = already_consumed + entry.portion_size
            if total_after_entry > planned_amount + 0.001:  # Tolerancia para decimales
                remaining = planned_amount - already_consumed
                raise HTTPException(
                    status_code=400,
                    detail=f"Excede lo planificado para {entry.meal_type}. "
                           f"Planificado: {planned_amount}, "
                           f"Ya consumido: {already_consumed}, "
                           f"Restante disponible: {remaining:.3f}, "
                           f"Intentando agregar: {entry.portion_size}"
                )

            validation_result = {
                "meal_type": entry.meal_type,
                "planned": planned_amount,
                "already_consumed": already_consumed,
                "adding": entry.portion_size,
                "total_after": total_after_entry,
                "valid": True
            }
            debug_info["validation_results"].append(validation_result)

        # Si todas las validaciones pasan, insertar los registros
        for entry in entries:
            new_log = FoodLog(
                user_id=current_user.user_id,
                food_id=entry.food_id,
                meal_type=entry.meal_type,
                portion_size=entry.portion_size,
                date=entry.date if entry.date else datetime.utcnow().date()
            )
            db.add(new_log)

        # Confirmar transacción
        db.commit()

        return {
            "message": f"{len(entries)} registros guardados correctamente",
            "debug": debug_info
        }

    except HTTPException:
        # Re-lanzar HTTPExceptions sin modificar
        db.rollback()
        raise
    except Exception as e:
        # Manejar otros errores
        db.rollback()
        error_detail = {
            "error_message": str(e),
            "error_type": str(type(e)),
            "debug_info": debug_info
        }
        raise HTTPException(422, detail=error_detail) from e
