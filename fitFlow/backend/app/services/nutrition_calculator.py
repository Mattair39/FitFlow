from abc import ABC, abstractmethod

from fitFlow.backend.app.models.client import Client


# Aqui uso STRATEGY PATTERN para crear una unica Interface para diferentes estrategias de cálculo nutricional
class INutritionCalculator(ABC):
    @abstractmethod
    def calculate_daily_requirements(self, client: Client) -> dict[str, float]:
        pass

    @abstractmethod
    def calculate_macronutrients(self, client: Client) -> dict[str, float]:
        pass

# Calculadora Estándar
class StandardNutritionCalculator(INutritionCalculator):
    """Calculadora estándar usando fórmulas tradicionales (Mifflin-St Jeor)"""
    def calculate_daily_requirements(self, client: Client) -> dict[str, float]:
        bmr = self._calculate_bmr(client)
        tdee = self._calculate_tdee(bmr, client.activity_level)
        rcde = self._adjust_for_goal(tdee, client.goal)

        return {
            'bmr': round(bmr, 1),
            'tdee': round(tdee, 1),
            'rcde': round(rcde, 1),
            'target_calories': round(rcde, 1)
        }

    def calculate_macronutrients(self, client: Client) -> dict[str, float]:
        rcde = client.calculate_RCDE()

        # Distribución estándar
        if client.goal.value == "Subir_Peso":
            protein_ratio, carbs_ratio, fat_ratio = 0.25, 0.45, 0.30
        elif client.goal.value == "Bajar_Peso":
            protein_ratio, carbs_ratio, fat_ratio = 0.30, 0.40, 0.30
        else:
            protein_ratio, carbs_ratio, fat_ratio = 0.20, 0.50, 0.30

        return {
            'protein_kcal': round(rcde * protein_ratio, 1),
            'protein_g': round((rcde * protein_ratio) / 4, 1),
            'carbs_kcal': round(rcde * carbs_ratio, 1),
            'carbs_g': round((rcde * carbs_ratio) / 4, 1),
            'fat_kcal': round(rcde * fat_ratio, 1),
            'fat_g': round((rcde * fat_ratio) / 9, 1)
        }

    def _calculate_bmr(self, client: Client) -> float:
        """Fórmula Mifflin-St Jeor"""
        age = client.calculate_age()
        if client.user.sex.value == "Masculino":
            return 10 * client.weight_current_kg + 6.25 * client.height_cm - 5 * age + 5
        return 10 * client.weight_current_kg + 6.25 * client.height_cm - 5 * age - 161

    def _calculate_tdee(self, bmr: float, activity_level) -> float:
        factors = {
            'Sedentario': 1.2, 'Ligero': 1.375, 'Moderado': 1.55,
            'Intenso': 1.725, 'Extremo': 1.9
        }
        return bmr * factors.get(activity_level.value, 1.2)

    def _adjust_for_goal(self, tdee: float, goal) -> float:
        if goal.value == "Bajar_Peso":
            return tdee - 500
        elif goal.value == "Subir_Peso":
            return tdee + 300
        return tdee


# Calculadora para Deportistas
class SportNutritionCalculator(INutritionCalculator):
    def calculate_daily_requirements(self, client: Client) -> dict[str, float]:
        bmr = self._calculate_bmr_katch_mcardle(client)
        tdee = self._calculate_tdee_sport(bmr, client.activity_level)
        rcde = self._adjust_for_sport_goal(tdee, client.goal)

        return {
            'bmr': round(bmr, 1),
            'tdee': round(tdee, 1),
            'rcde': round(rcde, 1),
            'target_calories': round(rcde, 1)
        }

    def calculate_macronutrients(self, client: Client) -> dict[str, float]:
        rcde = client.calculate_RCDE()

        # Macros optimizados para deportistas
        if client.goal.value == "Subir_Peso":
            protein_ratio, carbs_ratio, fat_ratio = 0.30, 0.45, 0.25
        elif client.goal.value == "Bajar_Peso":
            protein_ratio, carbs_ratio, fat_ratio = 0.35, 0.35, 0.30
        else:
            protein_ratio, carbs_ratio, fat_ratio = 0.25, 0.50, 0.25

        return {
            'protein_kcal': round(rcde * protein_ratio, 1),
            'protein_g': round((rcde * protein_ratio) / 4, 1),
            'carbs_kcal': round(rcde * carbs_ratio, 1),
            'carbs_g': round((rcde * carbs_ratio) / 4, 1),
            'fat_kcal': round(rcde * fat_ratio, 1),
            'fat_g': round((rcde * fat_ratio) / 9, 1)
        }

    def _calculate_bmr_katch_mcardle(self, client: Client) -> float:
        """Fórmula Katch-McArdle (más precisa para deportistas)"""
        # Estimación de grasa corporal simplificada
        body_fat_percentage = 0.12 if client.user.sex.value == "Masculino" else 0.20
        lean_mass = client.weight_current_kg * (1 - body_fat_percentage)
        return 370 + (21.6 * lean_mass)

    def _calculate_tdee_sport(self, bmr: float, activity_level) -> float:
        """TDEE con factores más altos para deportistas"""
        factors = {
            'Sedentario': 1.3, 'Ligero': 1.5, 'Moderado': 1.7,
            'Intenso': 1.9, 'Extremo': 2.2
        }
        return bmr * factors.get(activity_level.value, 1.3)

    def _adjust_for_sport_goal(self, tdee: float, goal) -> float:
        """Ajustes más conservadores para deportistas"""
        if goal.value == "Bajar_Peso":
            return tdee - 300  # Déficit menor
        elif goal.value == "Subir_Peso":
            return tdee + 500  # Superávit mayor
        return tdee