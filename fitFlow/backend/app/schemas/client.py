import enum
import re
from datetime import date

from fitFlow.backend.app.schemas.user import Sex
from fitFlow.backend.app.schemas.validators import validate_ecuadorian_cedula
from pydantic import BaseModel, validator


class ActivityLevel(str, enum.Enum):
    Sedentario = "Sedentario"
    Ligero = "Ligero"
    Moderado = "Moderado"
    Intenso = "Intenso"
    Extremo = "Extremo"

class Goal(str, enum.Enum):
    Bajar_Peso = "Bajar_Peso"
    Mantener_Peso = "Mantener_Peso"
    Subir_Peso = "Subir_Peso"


class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    cedula: str
    email: str
    password: str
    birth_date: date
    sex: Sex
    height_cm: float
    weight_current_kg: float
    weight_goal_kg: float
    activity_level: ActivityLevel
    goal: Goal  # <-- nuevo campo obligatorio

    @validator("cedula")
    def cedula_valida(cls, v: str) -> str:
        return validate_ecuadorian_cedula(v)

    @validator("password")
    def password_segura(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not re.search(r'[A-Z]', v):
            raise ValueError("La contraseña debe incluir al menos una letra mayúscula")
        if not re.search(r'\d', v):
            raise ValueError("La contraseña debe incluir al menos un número")
        if not re.search(r'[@$!%*?&]', v):
            raise ValueError("La contraseña debe incluir al menos un carácter especial (@$!%*?&)")
        return v


class ClientOut(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    cedula: str
    email: str
    birth_date: date
    sex: Sex
    height_cm: float
    weight_current_kg: float
    weight_goal_kg: float
    activity_level: ActivityLevel
    goal: Goal
    age: int | None
    metabolismo_basal: float | None
    get: float | None
    rcde: float | None


    class Config:
        from_attributes = True

