from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fitFlow.backend.app.api.auth import User, get_current_user
from fitFlow.backend.app.database.session import get_db
from fitFlow.backend.app.models.client import Client
from fitFlow.backend.app.services.nutrition_analysis import NutritionAnalysisService

# DEPENDENCY INVERSION PRINCIPLE - Importamos abstracciones, no implementaciones concretas
from fitFlow.backend.app.services.nutrition_calculator import (
    INutritionCalculator,
    SportNutritionCalculator,
    StandardNutritionCalculator,
)
from fitFlow.backend.app.services.plan_factory import NutritionPlanFactory
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(prefix="/nutrition-enhanced", tags=["NutritionEnhanced"])


# ===== MODELOS PYDANTIC =====
class PlanGenerationRequest(BaseModel):
    user_id: int
    plan_date: date
    plan_type: str = "simple"  # simple o sport
    calculator_type: str = "standard"  # standard o sport


class AnalysisRequest(BaseModel):
    calculator_type: str = "standard"


# ===== DEPENDENCY INJECTION =====
# DEPENDENCY INVERSION PRINCIPLE: Inyectamos dependencias en lugar de crearlas internamente

def get_nutrition_calculator(calculator_type: str = "standard") -> INutritionCalculator:
    """Factory function para crear calculadoras nutricionales"""
    calculators = {
        "standard": StandardNutritionCalculator,
        "sport": SportNutritionCalculator
    }

    if calculator_type not in calculators:
        raise HTTPException(400, f"Tipo de calculadora no válido: {calculator_type}")

    return calculators[calculator_type]()


def get_plan_factory() -> NutritionPlanFactory:
    """Inyecta la factory de planes"""
    return NutritionPlanFactory()


def get_analysis_service(calculator_type: str = "standard") -> NutritionAnalysisService:
    """Inyecta el servicio de análisis con la calculadora apropiada"""
    calculator = get_nutrition_calculator(calculator_type)
    return NutritionAnalysisService(calculator)


# ===== ENDPOINTS =====
@router.get("/calculator-types")
def get_available_calculators():
    return [
        {
            "type": "standard",
            "name": "Calculadora Estándar",
            "description": "Fórmulas tradicionales (Mifflin-St Jeor) para población general",
            "best_for": "Personas con actividad física ligera a moderada"
        },
        {
            "type": "sport",
            "name": "Calculadora Deportiva",
            "description": "Optimizada para deportistas (Katch-McArdle modificado)",
            "best_for": "Atletas y personas con actividad física intensa"
        }
    ]


@router.get("/plan-types")
def get_available_plan_types(factory: NutritionPlanFactory = Depends(get_plan_factory)):
    return factory.get_available_types()


@router.post("/generate-plan")
def generate_enhanced_plan(
        request: PlanGenerationRequest,
        current_user: User = Depends(get_current_user),
        factory: NutritionPlanFactory = Depends(get_plan_factory),
        db: Session = Depends(get_db)
):
    """
    Generacion de un plan nutricional usando los patrones de diseño implementados.
    Aplica DEPENDENCY INVERSION PRINCIPLE.
    """

    # Verificar cliente
    client = db.query(Client).filter(Client.client_id == request.user_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    # Verificar permisos
    if current_user.user_id != request.user_id:
        raise HTTPException(403, "No tienes permisos para generar planes de este usuario")

    try:
        # DEPENDENCY INVERSION: Usamos abstracciones inyectadas
        calculator = get_nutrition_calculator(request.calculator_type)
        generator = factory.create_plan_generator(request.plan_type, calculator)

        # Generar plan usando el patrón Strategy y Factory
        plan_data = generator.generate_plan(client, request.plan_date)

        return {
            "success": True,
            "message": f"Plan {request.plan_type} generado exitosamente con calculadora {request.calculator_type}",
            "plan_data": plan_data,
            "metadata": {
                "plan_type": request.plan_type,
                "calculator_type": request.calculator_type,
                "generated_at": date.today().isoformat(),
                "patterns_used": ["Strategy Pattern", "Factory Pattern", "Dependency Inversion"]
            }
        }

    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except Exception as e:
        raise HTTPException(500, f"Error interno: {str(e)}") from e


@router.get("/client/{user_id}/analysis")
def get_enhanced_analysis(
        user_id: int,
        calculator_type: str = Query("standard", description="Tipo de calculadora: standard o sport"),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """
    Obtiene análisis nutricional completo usando SRP y DIP.
    """
    # Verificar cliente
    client = db.query(Client).filter(Client.client_id == user_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    # Verificar permisos
    if current_user.user_id != user_id:
        raise HTTPException(403, "No tienes permisos para ver el análisis de este usuario")

    try:
        # DEPENDENCY INVERSION: Inyección de servicio de análisis
        analysis_service = get_analysis_service(calculator_type)

        # SINGLE RESPONSIBILITY: El servicio solo se encarga del análisis
        analysis = analysis_service.analyze_client_nutrition(client)

        return {
            "user_id": user_id,
            "calculator_type": calculator_type,
            "analysis": analysis,
            "generated_at": date.today().isoformat(),
            "principles_applied": ["Single Responsibility Principle", "Dependency Inversion Principle"]
        }

    except Exception as e:
        raise HTTPException(500, f"Error en análisis: {str(e)}") from e


@router.get("/compare-calculators/{user_id}")
def compare_calculators(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """
    Compara resultados entre diferentes calculadoras.
    Demuestra el uso del Strategy Pattern.
    """

    # Verificar cliente
    client = db.query(Client).filter(Client.client_id == user_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    # Verificar permisos
    if current_user.user_id != user_id:
        raise HTTPException(403, "No tienes permisos para comparar calculadoras de este usuario")

    try:
        # STRATEGY PATTERN: Usar diferentes estrategias de cálculo
        standard_calc = StandardNutritionCalculator()
        sport_calc = SportNutritionCalculator()

        standard_results = {
            "requirements": standard_calc.calculate_daily_requirements(client),
            "macros": standard_calc.calculate_macronutrients(client)
        }

        sport_results = {
            "requirements": sport_calc.calculate_daily_requirements(client),
            "macros": sport_calc.calculate_macronutrients(client)
        }

        # Calcular diferencias
        calorie_diff = sport_results["requirements"]["target_calories"] - standard_results["requirements"][
            "target_calories"]
        protein_diff = sport_results["macros"]["protein_g"] - standard_results["macros"]["protein_g"]

        return {
            "user_id": user_id,
            "comparison": {
                "standard": standard_results,
                "sport": sport_results,
                "differences": {
                    "calories": round(calorie_diff, 1),
                    "protein_g": round(protein_diff, 1),
                    "bmr_method": "Mifflin-St Jeor vs Katch-McArdle"
                }
            },
            "recommendation": _get_calculator_recommendation(client),
            "pattern_demonstrated": "Strategy Pattern - Different calculation algorithms"
        }

    except Exception as e:
        raise HTTPException(500, f"Error en comparación: {str(e)}") from e


def _get_calculator_recommendation(client: Client) -> str:
    """Recomienda qué calculadora usar según el perfil del cliente"""
    if client.activity_level.value in ["Intenso", "Extremo"]:
        return "sport - Recomendada para tu alto nivel de actividad física"
    elif client.goal.value == "Subir_Peso" and client.activity_level.value in ["Moderado", "Intenso"]:
        return "sport - Mejor para ganancia de masa muscular"
    else:
        return "standard - Adecuada para tu perfil actual"
