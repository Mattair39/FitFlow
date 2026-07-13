from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fitFlow.backend.app.api.auth import User, get_current_user
from fitFlow.backend.app.database.session import get_db
from fitFlow.backend.app.models.client import Client
from fitFlow.backend.app.models.food_log import FoodLog
from fitFlow.backend.app.models.nutrition_plan import NutritionPlan
from fitFlow.backend.app.models.nutrition_plan_meal import NutritionPlanMeal
from fitFlow.backend.app.schemas.nutrition_plan import NutritionPlanCreate
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

router = APIRouter(prefix="/nutrition-plans", tags=["NutritionPlans"])


def get_user_role(user_id: int, db: Session):
    """Determinar el rol del usuario"""
    try:
        from fitFlow.backend.app.models.admin import Admin
        from fitFlow.backend.app.models.nutritionist import Nutritionist
    except ImportError:
        # Si no existen estos modelos, solo verificar Client
        pass

    client = db.query(Client).filter(Client.client_id == user_id).first()
    if client:
        return "Cliente"

    try:
        nutritionist = db.query(Nutritionist).filter(Nutritionist.nutritionist_id == user_id).first()
        if nutritionist:
            return "Nutricionista"

        admin = db.query(Admin).filter(Admin.admin_id == user_id).first()
        if admin:
            return "Admin"
    except Exception:
        pass

    return "Cliente"  # Default fallback


@router.post("/")
def create_plan(plan: NutritionPlanCreate,
                db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    """Crear un plan nutricional con validación de fecha única"""

    try:
        # Verificar si ya existe un plan para ese usuario y fecha
        existing_plan = db.query(NutritionPlan).filter(
            and_(
                NutritionPlan.user_id == plan.user_id,
                NutritionPlan.plan_date == plan.plan_date
            )
        ).first()

        if existing_plan:
            raise HTTPException(
                400,
                f"Ya existe un plan para el usuario en la fecha {plan.plan_date}. "
                f"Solo se permite un plan por día por usuario."
            )

        # Crear el plan - verificar si la columna plan_date existe
        plan_data = {
            "user_id": plan.user_id,
            "nutritionist_id": plan.nutritionist_id,
            "name": plan.name,
            "description": plan.description
        }

        # Intentar agregar plan_date si existe la columna
        try:
            plan_data["plan_date"] = plan.plan_date
            new_plan = NutritionPlan(**plan_data)
        except TypeError:
            # Si falla, la columna no existe, crear sin plan_date
            del plan_data["plan_date"]
            new_plan = NutritionPlan(**plan_data)

        db.add(new_plan)
        db.flush()  # Para obtener el ID

        # Agregar las comidas
        for meal in plan.meals:
            new_meal = NutritionPlanMeal(
                plan_id=new_plan.plan_id,
                food_id=meal.food_id,
                meal_type=meal.meal_type,
                portion_size=meal.portion_size
            )
            db.add(new_meal)

        db.commit()
        db.refresh(new_plan)

        return {
            "message": "Plan nutricional creado correctamente",
            "plan_id": new_plan.plan_id,
            "plan_date": getattr(new_plan, 'plan_date', plan.plan_date),
            "success": True
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error al crear el plan: {str(e)}") from e


@router.get("/my-plans")
def get_my_plans(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        specific_date: date | None = Query(None, description="Fecha específica (YYYY-MM-DD)"),
        start_date: date | None = Query(None, description="Fecha de inicio del rango"),
        end_date: date | None = Query(None, description="Fecha de fin del rango"),
        week_offset: int | None = Query(None,
                                           description="Semanas desde hoy (0=esta semana, 1=próxima, -1=anterior)"),
        month_year: str | None = Query(None, description="Mes específico (YYYY-MM)")
):
    """
    Obtener planes del usuario con filtros de fecha avanzados
    Maneja correctamente los planes con plan_date NULL
    """

    try:
        query = db.query(NutritionPlan).options(
            joinedload(NutritionPlan.meals).joinedload(NutritionPlanMeal.food)
        ).filter(NutritionPlan.user_id == current_user.user_id)

        # Aplicar filtros de fecha solo si la columna plan_date existe y no es NULL
        if specific_date:
            query = query.filter(NutritionPlan.plan_date == specific_date)

        elif start_date and end_date:
            query = query.filter(
                and_(
                    NutritionPlan.plan_date >= start_date,
                    NutritionPlan.plan_date <= end_date
                )
            )

        elif week_offset is not None:
            today = date.today()
            days_since_monday = today.weekday()
            week_start = today - timedelta(days=days_since_monday)
            target_week_start = week_start + timedelta(weeks=week_offset)
            target_week_end = target_week_start + timedelta(days=6)

            query = query.filter(
                and_(
                    NutritionPlan.plan_date >= target_week_start,
                    NutritionPlan.plan_date <= target_week_end
                )
            )

        elif month_year:
            try:
                year, month = map(int, month_year.split('-'))
                month_start = date(year, month, 1)
                if month == 12:
                    month_end = date(year + 1, 1, 1) - timedelta(days=1)
                else:
                    month_end = date(year, month + 1, 1) - timedelta(days=1)

                query = query.filter(
                    and_(
                        NutritionPlan.plan_date >= month_start,
                        NutritionPlan.plan_date <= month_end
                    )
                )
            except ValueError as e:
                raise HTTPException(400, "Formato de month_year inválido. Use YYYY-MM") from e

        plans = query.order_by(NutritionPlan.created_at.desc()).all()

        # Formatear la respuesta manejando plan_date NULL
        result = []
        for plan in plans:
            # Obtener plan_date, usar fecha de creación como fallback si es NULL
            plan_date = getattr(plan, 'plan_date', None)
            if plan_date is None:
                # Si plan_date es NULL, usar la fecha de created_at
                plan_date = plan.created_at.date() if plan.created_at else date.today()

            plan_data = {
                "plan_id": plan.plan_id,
                "name": plan.name,
                "description": plan.description,
                "plan_date": plan_date,
                "created_at": plan.created_at,
                "meals": [
                    {
                        "id": meal.id,
                        "meal_type": meal.meal_type,
                        "portion_size": meal.portion_size,
                        "food_id": meal.food_id,
                        "food_name": meal.food.name
                    }
                    for meal in plan.meals
                ]
            }
            result.append(plan_data)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error al obtener planes: {str(e)}") from e


@router.get("/by-date/{target_date}")
def get_plan_by_date(target_date: date,
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """Obtener el plan específico de una fecha"""

    plan = db.query(NutritionPlan).options(
        joinedload(NutritionPlan.meals).joinedload(NutritionPlanMeal.food)
    ).filter(
        and_(
            NutritionPlan.user_id == current_user.user_id,
            NutritionPlan.plan_date == target_date
        )
    ).first()

    if not plan:
        raise HTTPException(404, f"No se encontró plan para la fecha {target_date}")

    # Manejar plan_date NULL
    plan_date = getattr(plan, 'plan_date', None)
    if plan_date is None:
        plan_date = plan.created_at.date() if plan.created_at else target_date

    return {
        "plan_id": plan.plan_id,
        "name": plan.name,
        "description": plan.description,
        "plan_date": plan_date,
        "created_at": plan.created_at,
        "meals": [
            {
                "id": meal.id,
                "meal_type": meal.meal_type,
                "portion_size": meal.portion_size,
                "food_id": meal.food_id,
                "food_name": meal.food.name
            }
            for meal in plan.meals
        ]
    }


@router.get("/week-overview")
def get_week_overview(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        week_offset: int = Query(0, description="Semanas desde hoy (0=esta semana)")
):
    """Obtener vista semanal de planes (7 días)"""

    today = date.today()
    days_since_monday = today.weekday()
    week_start = today - timedelta(days=days_since_monday)
    target_week_start = week_start + timedelta(weeks=week_offset)

    # Generar los 7 días de la semana
    week_days = []
    for i in range(7):
        day_date = target_week_start + timedelta(days=i)

        # Buscar plan para este día - manejar plan_date NULL
        plan_query = db.query(NutritionPlan).options(
            joinedload(NutritionPlan.meals).joinedload(NutritionPlanMeal.food)
        ).filter(NutritionPlan.user_id == current_user.user_id)

        # Intentar buscar por plan_date, si falla buscar por created_at
        try:
            plan = plan_query.filter(NutritionPlan.plan_date == day_date).first()
        except Exception:
            # Si plan_date no existe o falla, buscar por fecha de creación
            plan = plan_query.filter(
                func.date(NutritionPlan.created_at) == day_date
            ).first()

        day_info = {
            "date": day_date,
            "day_name": day_date.strftime("%A"),
            "is_today": day_date == today,
            "has_plan": plan is not None,
            "plan": None
        }

        if plan:
            day_info["plan"] = {
                "plan_id": plan.plan_id,
                "name": plan.name,
                "description": plan.description,
                "meals_count": len(plan.meals),
                "meals": [
                    {
                        "meal_type": meal.meal_type,
                        "food_name": meal.food.name,
                        "portion_size": meal.portion_size
                    }
                    for meal in plan.meals
                ]
            }

        week_days.append(day_info)

    return {
        "week_start": target_week_start,
        "week_end": target_week_start + timedelta(days=6),
        "week_offset": week_offset,
        "days": week_days
    }


@router.delete("/{plan_id}")
def delete_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Eliminar un plan nutricional"""

    plan = db.query(NutritionPlan).filter(NutritionPlan.plan_id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan no encontrado")

    # Verificar permisos simplificado
    if plan.user_id != current_user.user_id and plan.nutritionist_id != current_user.user_id:
        raise HTTPException(403, "No tienes permisos para eliminar este plan")

    try:
        # Verificar registros asociados
        plan_date = getattr(plan, 'plan_date', None)
        if plan_date:
            food_logs_count = db.query(FoodLog).filter(
                and_(
                    FoodLog.user_id == plan.user_id,
                    FoodLog.date == plan_date
                )
            ).count()
        else:
            # Si no hay plan_date, verificar por fecha de creación
            food_logs_count = db.query(FoodLog).filter(
                and_(
                    FoodLog.user_id == plan.user_id,
                    func.date(FoodLog.date) == func.date(plan.created_at)
                )
            ).count()

        if food_logs_count > 0:
            date_ref = plan_date or plan.created_at.date()
            raise HTTPException(400,
                                f"No se puede eliminar el plan porque tiene {food_logs_count} registros de comidas "
                                f"para la fecha {date_ref}. Usa el endpoint /force para eliminar forzadamente.")

        plan_name = plan.name
        plan_date_display = plan_date or plan.created_at.date()
        db.delete(plan)
        db.commit()

        return {
            "message": f"Plan '{plan_name}' del {plan_date_display} eliminado correctamente"
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error al eliminar el plan: {str(e)}") from e


@router.delete("/{plan_id}/force")
def force_delete_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Eliminar un plan forzadamente con todos sus registros"""

    plan = db.query(NutritionPlan).filter(NutritionPlan.plan_id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan no encontrado")

    if plan.user_id != current_user.user_id and plan.nutritionist_id != current_user.user_id:
        raise HTTPException(403, "No tienes permisos para eliminar este plan")

    try:
        # Eliminar registros asociados
        plan_date = getattr(plan, 'plan_date', None)
        if plan_date:
            food_logs = db.query(FoodLog).filter(
                and_(
                    FoodLog.user_id == plan.user_id,
                    FoodLog.date == plan_date
                )
            ).all()
        else:
            food_logs = db.query(FoodLog).filter(
                and_(
                    FoodLog.user_id == plan.user_id,
                    func.date(FoodLog.date) == func.date(plan.created_at)
                )
            ).all()

        deleted_logs = len(food_logs)
        for log in food_logs:
            db.delete(log)

        plan_name = plan.name
        plan_date_display = plan_date or plan.created_at.date()
        db.delete(plan)
        db.commit()

        return {
            "message": f"Plan '{plan_name}' del {plan_date_display} eliminado forzadamente",
            "deleted_food_logs": deleted_logs,
            "affected_date": plan_date_display
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error al eliminar el plan: {str(e)}") from e


@router.get("/status/{target_date}")
def check_plan_compliance_by_date(target_date: date, current_user: User = Depends(get_current_user),
                                  db: Session = Depends(get_db)):
    """Verificar cumplimiento del plan por fecha - CORREGIDO"""

    # Buscar el plan para esa fecha
    plan = db.query(NutritionPlan).options(
        joinedload(NutritionPlan.meals).joinedload(NutritionPlanMeal.food)
    ).filter(
        and_(
            NutritionPlan.user_id == current_user.user_id,
            or_(
                NutritionPlan.plan_date == target_date,
                func.date(NutritionPlan.created_at) == target_date
            )
        )
    ).first()

    if not plan:
        return {
            "plan_id": None,
            "plan_name": "Sin plan",
            "plan_date": target_date,
            "status": "No hay plan para esta fecha",
            "total_planned": 0,
            "fulfilled_count": 0,
            "adherence_percentage": 0,
            "detail": []
        }

    print(f"DEBUG: Plan encontrado: {plan.name}")
    print(f"DEBUG: Total de comidas en el plan: {len(plan.meals)}")

    compliance_detail = []
    total_planned = len(plan.meals)
    fulfilled_count = 0
    total_compliance = 0  # Para calcular adherencia correcta

    for meal in plan.meals:
        print(f"DEBUG: Procesando comida - {meal.meal_type}: {meal.food.name}")

        # 🔧 CORRECCIÓN PRINCIPAL: Usar SUM en lugar de .first()
        consumed_portion = db.query(func.sum(FoodLog.portion_size)).filter(
            and_(
                FoodLog.user_id == current_user.user_id,
                FoodLog.food_id == meal.food_id,
                FoodLog.meal_type == meal.meal_type,
                FoodLog.date == target_date
            )
        ).scalar() or 0.0

        planned_portion = meal.portion_size
        compliance_percentage = (consumed_portion / planned_portion * 100) if planned_portion > 0 else 0

        # Determinar estado
        if compliance_percentage >= 80 and compliance_percentage <= 120:
            status = "completo"
            fulfilled_count += 1
        elif compliance_percentage > 0:
            status = "parcial"
        else:
            status = "pendiente"

        total_compliance += compliance_percentage

        print(
            f"DEBUG: {meal.meal_type} - {meal.food.name}: Planificado={planned_portion}, Consumido={consumed_portion}, %={compliance_percentage}")

        compliance_detail.append({
            "food_id": meal.food_id,
            "food_name": meal.food.name,
            "meal_type": meal.meal_type,
            "planned_portion": planned_portion,
            "consumed_portion": consumed_portion,
            "compliance_percentage": round(compliance_percentage, 1),
            "fulfilled": compliance_percentage >= 80 and compliance_percentage <= 120,
            "status": status
        })

    # 🔧 CORRECCIÓN: Calcular adherencia basada en compliance total
    adherence_percentage = total_compliance / total_planned if total_planned > 0 else 0

    print(
        f"DEBUG: Total planificado: {total_planned}, Cumplido: {fulfilled_count}, Adherencia: {adherence_percentage}%")

    return {
        "plan_id": plan.plan_id,
        "plan_name": plan.name,
        "plan_date": target_date,
        "status": f"{fulfilled_count}/{total_planned} comidas cumplidas",
        "total_planned": total_planned,
        "fulfilled_count": fulfilled_count,
        "adherence_percentage": round(adherence_percentage, 1),
        "detail": compliance_detail
    }


@router.get("/{plan_id}/status")
def check_plan_compliance(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verificar cumplimiento del plan por ID - CORREGIDO"""

    plan = db.query(NutritionPlan).options(
        joinedload(NutritionPlan.meals).joinedload(NutritionPlanMeal.food)
    ).filter(
        and_(
            NutritionPlan.plan_id == plan_id,
            NutritionPlan.user_id == current_user.user_id
        )
    ).first()

    if not plan:
        raise HTTPException(404, "Plan no encontrado")

    # Usar plan_date o fecha de creación como fallback
    target_date = getattr(plan, 'plan_date', None)
    if target_date is None:
        target_date = plan.created_at.date() if plan.created_at else date.today()

    compliance_detail = []
    total_planned = len(plan.meals)
    fulfilled_count = 0
    total_compliance = 0

    for meal in plan.meals:
        # 🔧 CORRECCIÓN: Usar SUM en lugar de .first()
        consumed_portion = db.query(func.sum(FoodLog.portion_size)).filter(
            and_(
                FoodLog.user_id == current_user.user_id,
                FoodLog.food_id == meal.food_id,
                FoodLog.meal_type == meal.meal_type,
                FoodLog.date == target_date
            )
        ).scalar() or 0.0

        planned_portion = meal.portion_size
        compliance_percentage = (consumed_portion / planned_portion * 100) if planned_portion > 0 else 0

        # Determinar estado
        if compliance_percentage >= 80 and compliance_percentage <= 120:
            status = "completo"
            fulfilled_count += 1
        elif compliance_percentage > 0:
            status = "parcial"
        else:
            status = "pendiente"

        total_compliance += compliance_percentage

        compliance_detail.append({
            "food_id": meal.food_id,
            "food_name": meal.food.name,
            "meal_type": meal.meal_type,
            "planned_portion": planned_portion,
            "consumed_portion": consumed_portion,
            "compliance_percentage": round(compliance_percentage, 1),
            "fulfilled": compliance_percentage >= 80 and compliance_percentage <= 120,
            "status": status
        })

    adherence_percentage = total_compliance / total_planned if total_planned > 0 else 0

    return {
        "plan_id": plan.plan_id,
        "plan_name": plan.name,
        "plan_date": target_date,
        "status": f"{fulfilled_count}/{total_planned} comidas cumplidas",
        "total_planned": total_planned,
        "fulfilled_count": fulfilled_count,
        "adherence_percentage": round(adherence_percentage, 1),
        "detail": compliance_detail
    }


@router.get("/check-date/{target_date}")
def check_date_availability(target_date: date,
                            user_id: int = Query(..., description="ID del usuario"),
                            current_user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Verificar si una fecha está disponible para crear un plan"""

    try:
        existing_plan = db.query(NutritionPlan).filter(
            and_(
                NutritionPlan.user_id == user_id,
                NutritionPlan.plan_date == target_date
            )
        ).first()
    except Exception:
        # Si falla por plan_date, la columna no existe, retornar disponible
        existing_plan = None

    return {
        "date": target_date,
        "available": existing_plan is None,
        "existing_plan": {
            "plan_id": existing_plan.plan_id,
            "name": existing_plan.name,
            "description": existing_plan.description
        } if existing_plan else None
    }
