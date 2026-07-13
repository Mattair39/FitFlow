from typing import Any

from fitFlow.backend.app.models.client import Client
from fitFlow.backend.app.services.nutrition_calculator import INutritionCalculator


# Este servicio tiene UNA SOLA responsabilidad: analizar la situación nutricional del cliente
class NutritionAnalysisService:
    """
    Servicio dedicado exclusivamente al análisis nutricional del cliente.
    Responsabilidad única: Generar análisis y recomendaciones nutricionales.
    """

    def __init__(self, calculator: INutritionCalculator):
        self.calculator = calculator

    def analyze_client_nutrition(self, client: Client) -> dict[str, Any]:
        return {
            'daily_requirements': self.calculator.calculate_daily_requirements(client),
            'macronutrient_targets': self.calculator.calculate_macronutrients(client),
            'bmi_analysis': self._analyze_bmi(client),
            'goal_analysis': self._analyze_goal_feasibility(client),
            'recommendations': self._generate_recommendations(client)
        }

    def _analyze_bmi(self, client: Client) -> dict[str, Any]:
        bmi = client.calculate_bmi()
        category = client.get_bmi_category()

        return {
            'value': round(bmi, 1),
            'category': category,
            'healthy_range': (18.5, 24.9),
            'status': self._get_bmi_status(bmi),
            'recommendations': self._get_bmi_recommendations(bmi)
        }

    def _analyze_goal_feasibility(self, client: Client) -> dict[str, Any]:
        weeks_to_goal = client.estimate_weeks_to_goal()
        weight_change = client.calculate_weight_change_needed()

        return {
            'weeks_estimated': round(weeks_to_goal, 1),
            'weight_change_needed': round(weight_change, 1),
            'feasible': weeks_to_goal <= 52,  # Un año máximo
            'timeline_category': self._categorize_timeline(weeks_to_goal),
            'recommended_rate': self._get_recommended_rate(client.goal.value)
        }

    def _generate_recommendations(self, client: Client) -> list[str]:
        recommendations = []

        # Recomendaciones por objetivo
        if client.goal.value == "Bajar_Peso":
            recommendations.extend([
                "Mantén un déficit calórico constante pero moderado",
                "Prioriza proteínas para preservar masa muscular",
                "Incluye ejercicio cardiovascular y de fuerza",
                "Aumenta el consumo de fibra y agua"
            ])
        elif client.goal.value == "Subir_Peso":
            recommendations.extend([
                "Aumenta calorías gradualmente con alimentos nutritivos",
                "Enfócate en proteínas de alta calidad",
                "Incluye carbohidratos complejos en cada comida",
                "Considera suplementación si es necesario"
            ])
        else:  # Mantener peso
            recommendations.extend([
                "Mantén una alimentación balanceada y consistente",
                "Monitorea tu peso semanalmente",
                "Ajusta calorías según tu nivel de actividad",
                "Enfócate en la calidad nutricional"
            ])

        # Recomendaciones por IMC
        bmi = client.calculate_bmi()
        if bmi < 18.5:
            recommendations.append("Consulta con un profesional para evaluar posible bajo peso")
        elif bmi >= 30:
            recommendations.append("Considera un enfoque gradual y sostenible para la pérdida de peso")

        # Recomendaciones por nivel de actividad
        if client.activity_level.value == "Sedentario":
            recommendations.append("Considera aumentar gradualmente tu nivel de actividad física")
        elif client.activity_level.value in ["Intenso", "Extremo"]:
            recommendations.append("Asegúrate de una hidratación y recuperación adecuadas")

        return recommendations

    def _get_bmi_status(self, bmi: float) -> str:
        """Determina el estado del IMC"""
        if bmi < 18.5:
            return "bajo_peso"
        elif 18.5 <= bmi < 25:
            return "normal"
        elif 25 <= bmi < 30:
            return "sobrepeso"
        else:
            return "obesidad"

    def _get_bmi_recommendations(self, bmi: float) -> list[str]:
        """Recomendaciones específicas según IMC"""
        if bmi < 18.5:
            return [
                "Aumenta la ingesta calórica de forma saludable",
                "Incluye proteínas en cada comida",
                "Consulta con un profesional de la salud"
            ]
        elif bmi >= 30:
            return [
                "Prioriza la pérdida de peso gradual",
                "Aumenta el consumo de vegetales y fibra",
                "Incluye actividad física regular"
            ]
        else:
            return ["Mantén tus hábitos alimentarios saludables actuales"]

    def _categorize_timeline(self, weeks: float) -> str:
        """Categoriza la línea de tiempo del objetivo"""
        if weeks <= 12:
            return "corto_plazo"
        elif weeks <= 26:
            return "mediano_plazo"
        else:
            return "largo_plazo"

    def _get_recommended_rate(self, goal: str) -> str:
        """Retorna la tasa recomendada según el objetivo"""
        if goal == "Bajar_Peso":
            return "0.5-1 kg por semana"
        elif goal == "Subir_Peso":
            return "0.25-0.5 kg por semana"
        else:
            return "Mantener peso actual"