import re
from datetime import date
from enum import Enum

from fitFlow.backend.app.schemas.user import Sex
from fitFlow.backend.app.schemas.validators import validate_ecuadorian_cedula
from pydantic import BaseModel, validator


class EspecialidadNutricionista(str, Enum):
    nutricion_clinica = "Nutrición Clínica"
    nutricion_deportiva = "Nutrición Deportiva"
    nutricion_pediatrica = "Nutrición Pediátrica"
    nutricion_geriatrica = "Nutrición Geriátrica"
    nutricion_renal = "Nutrición Renal"
    nutricion_oncologica = "Nutrición Oncológica"
    nutricion_materno_infantil = "Nutrición Materno Infantil"
    educacion_nutricional = "Educación Nutricional"
    nutricion_publica = "Nutrición Pública"
    nutricion_alimentacion_colectiva = "Nutrición y Alimentación Colectiva"

class NutritionistCreate(BaseModel):
    first_name: str
    last_name: str
    cedula: str
    email: str
    password: str
    birth_date: date
    sex: Sex
    certification_number: str
    specialty: EspecialidadNutricionista

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
