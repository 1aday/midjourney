from sqlalchemy import Column, String, JSON, DateTime, Text, text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from .database import Base

class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_job_id = Column(String, nullable=False)
    prompt = Column(Text, nullable=False)
    parameters = Column(JSON, nullable=False)
    image_url = Column(String, nullable=False)
    modified_images = Column(JSON, nullable=False, server_default='[]')
    created_at = Column(DateTime(timezone=True), nullable=False)
    saved_at = Column(DateTime(timezone=True), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    notes = Column(Text)
