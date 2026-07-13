from fitFlow.backend.app.database.session import Base
from sqlalchemy import Column, Float, Integer, String


class Food(Base):
    __tablename__ = "foods"

    food_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(255), nullable=True)

    calories_per_portion = Column(Float, nullable=False)
    protein_per_portion = Column(Float, nullable=False)
    fat_per_portion = Column(Float, nullable=False)
    carbs_per_portion = Column(Float, nullable=False)

    portion_unit = Column(String(50), nullable=False)
