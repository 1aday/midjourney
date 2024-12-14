from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID

class ModifiedImage(BaseModel):
    type: str
    url: str

class SavedJobCreate(BaseModel):
    original_job_id: str
    prompt: str
    parameters: Dict
    image_url: str
    modified_images: List[ModifiedImage] = []
    created_at: datetime
    notes: Optional[str] = None

class SavedJobUpdate(BaseModel):
    notes: str

class SavedJob(SavedJobCreate):
    id: UUID
    saved_at: datetime

    class Config:
        from_attributes = True
