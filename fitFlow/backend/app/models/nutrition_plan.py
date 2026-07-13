from datetime import datetime

from fitFlow.backend.app.database.session import Base
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship


class NutritionPlan(Base):
    __tablename__ = "nutrition_plans"

    plan_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    nutritionist_id = Column(Integer, ForeignKey("nutritionists.nutritionist_id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    plan_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    meals = relationship("NutritionPlanMeal", back_populates="plan", cascade="all, delete-orphan")

    # Agregar índice único para evitar múltiples planes por día
    __table_args__ = (
        UniqueConstraint('user_id', 'nutritionist_id', 'plan_date',
                         name='_user_nutritionist_date_uc'),
    )