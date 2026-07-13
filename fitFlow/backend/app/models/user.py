import enum

from fitFlow.backend.app.database.session import Base
from sqlalchemy import Column, Date, Enum, Integer, String
from sqlalchemy.orm import relationship


class Sex(enum.Enum):
    Masculino = "Masculino"
    Femenino = "Femenino"

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    cedula = Column(String(20), unique=True, nullable=False)
    email = Column(String(50), unique=True, nullable=False)
    password = Column(String(128), nullable=False)
    birth_date = Column(Date, nullable=False)
    sex = Column(Enum(Sex), nullable=False)

    client = relationship(
        "Client",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan"
    )
    nutritionist = relationship(
        "Nutritionist",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan"
    )
    admin = relationship(
        "Admin",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan"
    )

