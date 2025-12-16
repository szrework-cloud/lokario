from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import json
from app.db.base import Base


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULE_REQUESTED = "reschedule_requested"


class AppointmentType(Base):
    __tablename__ = "appointment_types"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=30)
    buffer_before_minutes = Column(Integer, nullable=True, default=0)
    buffer_after_minutes = Column(Integer, nullable=True, default=0)
    employees_allowed_ids = Column(Text, nullable=True)  # JSON array of user IDs
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="appointment_types")
    appointments = relationship("Appointment", back_populates="type")
    
    def get_employees_allowed_ids(self):
        """Parse employees_allowed_ids from JSON string to list"""
        if not self.employees_allowed_ids:
            return []
        try:
            return json.loads(self.employees_allowed_ids)
        except:
            return []
    
    def set_employees_allowed_ids(self, ids: list):
        """Set employees_allowed_ids as JSON string"""
        if ids:
            self.employees_allowed_ids = json.dumps(ids)
        else:
            self.employees_allowed_ids = None


class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Relations
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    type_id = Column(Integer, ForeignKey("appointment_types.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    
    # Dates
    start_date_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date_time = Column(DateTime(timezone=True), nullable=False)
    
    # Statut
    status = Column(SQLEnum(AppointmentStatus), nullable=False, default=AppointmentStatus.SCHEDULED, index=True)
    
    # Notes
    notes_internal = Column(Text, nullable=True)
    
    # Création
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="appointments")
    client = relationship("Client", backref="appointments")
    type = relationship("AppointmentType", back_populates="appointments")
    employee = relationship("User", foreign_keys=[employee_id], backref="appointments")
    conversation = relationship("Conversation", backref="appointments")
    created_by = relationship("User", foreign_keys=[created_by_id])


