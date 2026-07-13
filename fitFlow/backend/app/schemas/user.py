import enum
import re
from datetime import date

from pydantic import BaseModel, EmailStr, validator


class Sex(str, enum.Enum):
    Masculino = "Masculino"
    Femenino = "Femenino"
class Goal(str, enum.Enum):
    Bajar_Peso = "Bajar_Peso"
    Mantener_Peso = "Mantener_Peso"
    Subir_Peso = "Subir_Peso"

class UserBase(BaseModel):
    first_name: str
    last_name: str
    cedula: str
    email: EmailStr
    password: str
    birth_date: date
    sex: Sex

    @validator("cedula")
    def validate_cedula(cls, v):
        if not re.fullmatch(r"\d{6,20}", v):
            raise ValueError("Cédula must be 6–20 dígitos")
        return v

class UserCreate(UserBase):
    pass

class UserOut(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    cedula: str
    email: str
    birth_date: date
    sex: Sex
    role: str | None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str
