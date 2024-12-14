from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID

class ModifiedImage(BaseModel):
    type: str
    url: str

class SavedJobCreate(BaseModel):
    prompt: str
    parameters: Dict
    image_url: str
    modified_images: List[ModifiedImage] = []
    original_job_id: Optional[str] = None
    created_at: Optional[datetime] = None
    notes: Optional[str] = None

    def model_dump(self):
        data = super().model_dump()
        if not data.get('created_at'):
            data['created_at'] = datetime.utcnow()
        if not data.get('original_job_id'):
            data['original_job_id'] = 'manual'
        return data

class SavedJobUpdate(BaseModel):
    notes: str

class SavedJob(SavedJobCreate):
    id: UUID
    saved_at: datetime

    class Config:
        from_attributes = True
