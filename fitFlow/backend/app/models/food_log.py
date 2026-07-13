
from fitFlow.backend.app.database.session import Base
from fitFlow.backend.app.models.nutrition_plan_meal import MealType
from sqlalchemy import Column, Date, Enum, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship


class FoodLog(Base):
    __tablename__ = "food_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.food_id"), nullable=False)

    date = Column(Date, nullable=False)
    meal_type = Column(Enum(MealType), nullable=False)
    portion_size = Column(Float, nullable=False)

    user = relationship("User")
    food = relationship("Food")
