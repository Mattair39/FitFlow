from fitFlow.backend.app.database.session import Base
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class Admin(Base):
    __tablename__ = "admins"

    admin_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    department = Column(String(50), nullable=True)
    phone_number = Column(String(20), nullable=True)

    user = relationship("User", back_populates="admin")
