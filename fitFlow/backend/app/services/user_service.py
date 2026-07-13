from fastapi import HTTPException
from fitFlow.backend.app.core.security import get_password_hash
from fitFlow.backend.app.models.user import User
from fitFlow.backend.app.schemas.user import Goal, UserCreate
from sqlalchemy.orm import Session


def register_user(user: UserCreate, db: Session):
    existing_user = db.query(User).filter(User.cedula == user.cedula).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cedula already registered")

    new_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        cedula=user.cedula,
        hashed_password=get_password_hash(user.password),
        birth_date=user.birth_date,
        sex=user.sex,
        height_cm=user.height_cm,
        weight_current_kg=user.weight_current_kg,
        weight_goal_kg=user.weight_goal_kg,
        activity_level=user.activity_level,
        role_id=user.role_id
    )

    new_user.rcde_kcal_per_day = new_user.calculate_RCDE(Goal.Mantener_Peso)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
