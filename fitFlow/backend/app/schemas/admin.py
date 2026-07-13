# backend/app/schemas/admin.py
import re
from datetime import date

from fitFlow.backend.app.schemas.user import Sex
from fitFlow.backend.app.schemas.validators import validate_ecuadorian_cedula
from pydantic import BaseModel, EmailStr, validator


class AdminCreate(BaseModel):
    first_name: str
    last_name: str
    cedula: str
    email: EmailStr
    password: str
    birth_date: date
    sex: Sex
    department: str
    phone_number: str

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
