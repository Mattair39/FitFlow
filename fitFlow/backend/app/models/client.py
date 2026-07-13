import enum
from datetime import date

from fitFlow.backend.app.database.session import Base
from sqlalchemy import Column, Enum, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship


class ActivityLevel(enum.Enum):
    Sedentario = "Sedentario"
    Ligero = "Ligero"
    Moderado = "Moderado"
    Intenso = "Intenso"
    Extremo = "Extremo"


class Goal(enum.Enum):
    Bajar_Peso = "Bajar_Peso"
    Mantener_Peso = "Mantener_Peso"
    Subir_Peso = "Subir_Peso"


class Client(Base):
    __tablename__ = "clients"

    client_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    height_cm = Column(Float, nullable=False)
    weight_current_kg = Column(Float, nullable=False)
    weight_goal_kg = Column(Float, nullable=False)
    activity_level = Column(Enum(ActivityLevel), nullable=False)
    goal = Column(Enum(Goal), nullable=False)

    user = relationship("User", back_populates="client")

    def calculate_age(self):
        """Calcula la edad actual del usuario"""
        today = date.today()
        return today.year - self.user.birth_date.year - (
                    (today.month, today.day) < (self.user.birth_date.month, self.user.birth_date.day))

    def calculate_metabolismo_basal(self):
        """Calcula el Metabolismo Basal usando fórmula Mifflin-St Jeor"""
        age = self.calculate_age()
        if self.user.sex.value == "Masculino":
            return 10 * self.weight_current_kg + 6.25 * self.height_cm - 5 * age + 5
        return 10 * self.weight_current_kg + 6.25 * self.height_cm - 5 * age - 161

    def calculate_GET(self):
        """Calcula el Gasto Energético Total (GET = MB × Factor de Actividad)"""
        factor_map = {
            ActivityLevel.Sedentario: 1.2,
            ActivityLevel.Ligero: 1.375,
            ActivityLevel.Moderado: 1.55,
            ActivityLevel.Intenso: 1.725,
            ActivityLevel.Extremo: 1.9,
        }
        return self.calculate_metabolismo_basal() * factor_map[self.activity_level]

    def calculate_RCDE(self):
        """Calcula el Requerimiento Calórico Diario Estimado según objetivo"""
        get = self.calculate_GET()
        if self.goal == Goal.Bajar_Peso:
            return get - 500
        elif self.goal == Goal.Subir_Peso:
            return get + 300
        return get

    def calculate_progress_percentage(self):
        """Calcula el progreso hacia el peso objetivo (%)"""
        if self.weight_current_kg == self.weight_goal_kg:
            return 100.0

        weight_initial = self.weight_current_kg  # Placeholder

        progress = abs(weight_initial - self.weight_current_kg) / abs(weight_initial - self.weight_goal_kg)
        return min(progress * 100, 100.0)

    def calculate_bmi(self):
        """Calcula el Índice de Masa Corporal"""
        height_m = self.height_cm / 100
        return self.weight_current_kg / (height_m ** 2)

    def get_bmi_category(self):
        """Retorna la categoría del IMC"""
        bmi = self.calculate_bmi()
        if bmi < 18.5:
            return "Bajo peso"
        elif bmi < 25:
            return "Peso normal"
        elif bmi < 30:
            return "Sobrepeso"
        else:
            return "Obesidad"

    def calculate_weight_change_needed(self):
        """Calcula los kg que faltan para alcanzar el objetivo"""
        return self.weight_goal_kg - self.weight_current_kg

    def estimate_weeks_to_goal(self):
        """Estima las semanas necesarias para alcanzar el objetivo"""
        weight_change = abs(self.calculate_weight_change_needed())

        if self.goal == Goal.Bajar_Peso:
            # Déficit de 500 kcal/día = ~0.5 kg/semana
            return weight_change / 0.5
        elif self.goal == Goal.Subir_Peso:
            # Superávit de 300 kcal/día = ~0.3 kg/semana
            return weight_change / 0.3
        else:
            return 0

    def calculate_recommended_exercise_calories(self):
        """Calcula las calorías recomendadas a quemar con ejercicio"""
        if self.goal == Goal.Bajar_Peso:
            # Para potenciar la pérdida de peso
            return 200  # kcal adicionales por día
        elif self.goal == Goal.Subir_Peso:
            # Ejercicio ligero para mantener salud
            return 150
        else:
            # Mantenimiento
            return 250

    def get_macronutrient_targets(self):
        """Calcula los objetivos de macronutrientes"""
        rcde = self.calculate_RCDE()

        # Distribución estándar de macronutrientes
        if self.goal == Goal.Subir_Peso:
            # Más proteínas para ganancia muscular
            protein_ratio = 0.25
            carbs_ratio = 0.45
            fat_ratio = 0.30
        else:
            # Distribución balanceada
            protein_ratio = 0.20
            carbs_ratio = 0.50
            fat_ratio = 0.30

        return {
            "protein_kcal": rcde * protein_ratio,
            "protein_g": (rcde * protein_ratio) / 4,  # 4 kcal/g
            "carbs_kcal": rcde * carbs_ratio,
            "carbs_g": (rcde * carbs_ratio) / 4,  # 4 kcal/g
            "fat_kcal": rcde * fat_ratio,
            "fat_g": (rcde * fat_ratio) / 9  # 9 kcal/g
        }