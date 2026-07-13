from abc import ABC, abstractmethod
from datetime import date
from typing import Any

from fitFlow.backend.app.models.client import Client
from fitFlow.backend.app.services.nutrition_calculator import INutritionCalculator


# Implementacion del FACTORY PATTERN con una interfaz para los distintos generadores de planes
class IPlanGenerator(ABC):
    """Interface para diferentes generadores de planes"""
    @abstractmethod
    def generate_plan(self, client: Client, target_date: date) -> dict[str, Any]:
        pass

# Generador Simple
class SimplePlanGenerator(IPlanGenerator):

    def __init__(self, calculator: INutritionCalculator):
        self.calculator = calculator

    def generate_plan(self, client: Client, target_date: date) -> dict[str, Any]:
        requirements = self.calculator.calculate_daily_requirements(client)
        target_calories = requirements['target_calories']

        # Distribución calórica por comida
        meal_distribution = {
            'Desayuno': 0.25,
            'Almuerzo': 0.35,
            'Cena': 0.30,
            'Snack': 0.10
        }

        meals = []
        for meal_type, percentage in meal_distribution.items():
            meal_calories = target_calories * percentage
            meals.append({
                'meal_type': meal_type,
                'target_calories': round(meal_calories, 1),
                'percentage': percentage * 100
            })

        return {
            'type': 'simple',
            'name': f"Plan Simple - {target_date}",
            'target_calories': target_calories,
            'meals': meals,
            'description': f"Plan básico balanceado para {target_calories} kcal diarias",
            'nutritional_info': self.calculator.calculate_macronutrients(client)
        }


# Generador Deportivo
class SportPlanGenerator(IPlanGenerator):
    def __init__(self, calculator: INutritionCalculator):
        self.calculator = calculator

    def generate_plan(self, client: Client, target_date: date) -> dict[str, Any]:
        """Genera un plan optimizado para deportistas"""
        requirements = self.calculator.calculate_daily_requirements(client)
        target_calories = requirements['target_calories']

        # Distribución específica para deportistas
        meal_distribution = {
            'Desayuno': 0.20,  # Menor en la mañana
            'Pre-Entrenamiento': 0.15,  # Snack antes del ejercicio
            'Almuerzo': 0.30,  # Comida principal
            'Post-Entrenamiento': 0.20,  # Recuperación
            'Cena': 0.15  # Ligera en la noche
        }

        meals = []
        for meal_type, percentage in meal_distribution.items():
            meal_calories = target_calories * percentage
            meals.append({
                'meal_type': meal_type,
                'target_calories': round(meal_calories, 1),
                'percentage': percentage * 100,
                'focus': self._get_meal_focus(meal_type)
            })

        return {
            'type': 'sport',
            'name': f"Plan Deportivo - {target_date}",
            'target_calories': target_calories,
            'meals': meals,
            'description': f"Plan optimizado para deportistas - {target_calories} kcal con timing nutricional",
            'nutritional_info': self.calculator.calculate_macronutrients(client),
            'sport_notes': "Incluye comidas pre y post-entrenamiento para optimizar rendimiento"
        }

    def _get_meal_focus(self, meal_type: str) -> str:
        focus_map = {
            'Desayuno': 'Proteínas + Carbohidratos complejos',
            'Pre-Entrenamiento': 'Carbohidratos rápidos + Proteína ligera',
            'Almuerzo': 'Balanceado - Todos los macronutrientes',
            'Post-Entrenamiento': 'Proteínas + Carbohidratos para recuperación',
            'Cena': 'Proteínas + Verduras + Grasas saludables'
        }
        return focus_map.get(meal_type, 'Balanceado')


# Fábrica Concreta
class NutritionPlanFactory:
    def __init__(self):
        self._generators = {
            'simple': SimplePlanGenerator,
            'sport': SportPlanGenerator
        }

    def create_plan_generator(self, plan_type: str, calculator: INutritionCalculator) -> IPlanGenerator:
        """Crea un generador de planes del tipo especificado"""
        if plan_type not in self._generators:
            raise ValueError(
                f"Tipo de plan no soportado: {plan_type}. Tipos disponibles: {list(self._generators.keys())}")

        generator_class = self._generators[plan_type]
        return generator_class(calculator)

    def get_available_types(self) -> list[dict[str, str]]:
        """Retorna los tipos de planes disponibles"""
        return [
            {
                'type': 'simple',
                'name': 'Plan Simple',
                'description': 'Plan básico con distribución estándar de comidas'
            },
            {
                'type': 'sport',
                'name': 'Plan Deportivo',
                'description': 'Plan optimizado para deportistas con timing nutricional'
            }
        ]