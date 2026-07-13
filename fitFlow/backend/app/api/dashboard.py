from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fitFlow.backend.app.api.auth import User, get_current_user
from fitFlow.backend.app.database.session import get_db
from fitFlow.backend.app.models.client import Client
from fitFlow.backend.app.models.food_log import FoodLog
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/nutrition-metrics")
def get_nutrition_metrics(current_user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    # Verificar que el usuario es un cliente
    client = db.query(Client).options(joinedload(Client.user)).filter(
        Client.client_id == current_user.user_id
    ).first()

    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    backend_today = date.today()

    # SOLUCIÓN INTELIGENTE: Buscar la fecha más reciente con datos
    # Buscar en un rango de ±3 días desde hoy
    dates_to_check = []
    for i in range(-3, 4):  # -3, -2, -1, 0, 1, 2, 3
        dates_to_check.append(backend_today + timedelta(days=i))

    # Encontrar qué fechas tienen registros
    recent_logs = db.query(FoodLog.date, func.count(FoodLog.log_id)).filter(
        FoodLog.user_id == current_user.user_id,
        FoodLog.date.in_(dates_to_check)
    ).group_by(FoodLog.date).order_by(FoodLog.date.desc()).all()

    # Usar la fecha más reciente con datos, o hoy si no hay datos
    if recent_logs:
        today = recent_logs[0][0]  # Fecha más reciente con datos
        print(f"🔍 USANDO FECHA CON DATOS: {today} ({recent_logs[0][1]} registros)")
    else:
        today = backend_today
        print(f"🔍 NO HAY DATOS RECIENTES, USANDO: {today}")

    print(f"🔍 DEBUG FECHA BACKEND: {backend_today}")
    print(f"🔍 DEBUG FECHA FINAL USADA: {today}")

    week_start = today - timedelta(days=today.weekday())

    # 1. Métricas básicas del cliente
    basic_metrics = {
        "user_info": {
            "name": f"{client.user.first_name} {client.user.last_name}",
            "age": client.calculate_age(),
            "height_cm": client.height_cm,
            "weight_current": client.weight_current_kg,
            "weight_goal": client.weight_goal_kg,
            "goal": client.goal.value,
            "activity_level": client.activity_level.value
        },
        "calculated_metrics": {
            "metabolismo_basal": round(client.calculate_metabolismo_basal(), 1),
            "get": round(client.calculate_GET(), 1),
            "rcde": round(client.calculate_RCDE(), 1),
            "bmi": round(client.calculate_bmi(), 1),
            "bmi_category": client.get_bmi_category(),
            "weight_change_needed": round(client.calculate_weight_change_needed(), 1),
            "weeks_to_goal": round(client.estimate_weeks_to_goal(), 1),
            "recommended_exercise_calories": client.calculate_recommended_exercise_calories()
        },
        "macronutrient_targets": client.get_macronutrient_targets()
    }

    # 2. Consumo calórico del día seleccionado
    today_logs = db.query(FoodLog).options(joinedload(FoodLog.food)).filter(
        FoodLog.user_id == current_user.user_id,
        FoodLog.date == today
    ).all()

    print(f"🔍 REGISTROS ENCONTRADOS: {len(today_logs)} para {today}")

    today_consumption = {
        "total_calories": 0,
        "total_protein": 0,
        "total_carbs": 0,
        "total_fat": 0,
        "by_meal": {"Desayuno": 0, "Almuerzo": 0, "Cena": 0, "Snack": 0}
    }

    for log in today_logs:
        calories = log.food.calories_per_portion * log.portion_size
        protein = log.food.protein_per_portion * log.portion_size
        carbs = log.food.carbs_per_portion * log.portion_size
        fat = log.food.fat_per_portion * log.portion_size

        today_consumption["total_calories"] += calories
        today_consumption["total_protein"] += protein
        today_consumption["total_carbs"] += carbs
        today_consumption["total_fat"] += fat
        today_consumption["by_meal"][log.meal_type.value] += calories

    print(f"🔍 TOTAL CALORÍAS CALCULADAS: {today_consumption['total_calories']}")

    # 3. Cálculo de cumplimiento calórico
    rcde = client.calculate_RCDE()
    caloric_compliance = {
        "target_calories": round(rcde, 1),
        "consumed_calories": round(today_consumption["total_calories"], 1),
        "difference": round(today_consumption["total_calories"] - rcde, 1),
        "percentage": round((today_consumption["total_calories"] / rcde) * 100, 1) if rcde > 0 else 0,
        "status": "optimal" if 90 <= (today_consumption["total_calories"] / rcde) * 100 <= 110 else
        "low" if (today_consumption["total_calories"] / rcde) * 100 < 90 else "high"
    }

    # 4. Adherencia semanal (basada en la fecha que estamos usando)
    week_logs = db.query(FoodLog.date, func.count(FoodLog.log_id)).filter(
        FoodLog.user_id == current_user.user_id,
        FoodLog.date >= week_start,
        FoodLog.date <= today
    ).group_by(FoodLog.date).all()

    days_with_logs = len(week_logs)
    days_elapsed = (today - week_start).days + 1

    weekly_adherence = {
        "days_with_logs": days_with_logs,
        "days_elapsed": days_elapsed,
        "adherence_percentage": round((days_with_logs / days_elapsed) * 100, 1) if days_elapsed > 0 else 0
    }

    # 5. Consumo por día de la semana (últimos 7 días desde la fecha usada)
    week_daily_consumption = []
    for i in range(7):
        day = today - timedelta(days=i)
        day_logs = db.query(FoodLog).options(joinedload(FoodLog.food)).filter(
            FoodLog.user_id == current_user.user_id,
            FoodLog.date == day
        ).all()

        day_total = sum(log.food.calories_per_portion * log.portion_size for log in day_logs)

        week_daily_consumption.append({
            "date": day.isoformat(),
            "day_name": day.strftime("%A"),
            "calories": round(day_total, 1),
            "target": round(rcde, 1),
            "compliance": round((day_total / rcde) * 100, 1) if rcde > 0 else 0,
            "is_today": day == today
        })

    return {
        "basic_metrics": basic_metrics,
        "today_consumption": today_consumption,
        "caloric_compliance": caloric_compliance,
        "weekly_adherence": weekly_adherence,
        "week_daily_consumption": list(reversed(week_daily_consumption)),
        "debug_info": {
            "backend_real_date": backend_today.isoformat(),
            "date_used_for_metrics": today.isoformat(),
            "logs_found": len(today_logs),
            "user_id": current_user.user_id,
            "available_dates": [{"date": str(log_date), "count": count} for log_date, count in recent_logs]
        }
    }