from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import httpx
from typing import Optional, Dict, Any, List
from uuid import UUID

from .database import engine, get_db
from . import models, schemas

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = "905588e1-9a2d-4e7f-9f3d-01df73c0b770"
API_BASE_URL = "https://api.userapi.ai"

async def forward_request(path: str, method: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    async with httpx.AsyncClient() as client:
        headers = {
            "api-key": API_KEY,
            "Content-Type": "application/json"
        }
        url = f"{API_BASE_URL}{path}"

        try:
            if method == "POST":
                response = await client.post(url, json=data, headers=headers)
            else:
                response = await client.get(url, headers=headers, params=data)

            # Log the response for debugging
            print(f"API Response ({method} {path}):", response.status_code)
            print("Response content:", response.text)

            # If the response is not successful, raise the actual error from the API
            if response.status_code >= 400:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get('detail', str(error_data))
                )

            return response.json()
        except httpx.HTTPError as e:
            print(f"HTTP Error in forward_request: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            print(f"Unexpected error in forward_request: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/midjourney/v2/imagine")
async def imagine(request: Dict[str, Any]):
    return await forward_request("/midjourney/v2/imagine", "POST", request)

@app.get("/midjourney/v2/status")
async def get_status(hash: str):
    return await forward_request("/midjourney/v2/status", "GET", {"hash": hash})

@app.post("/midjourney/v2/upscale")
async def upscale(request: Dict[str, Any]):
    return await forward_request("/midjourney/v2/upscale", "POST", request)

@app.post("/midjourney/v2/variation")
async def variation(request: Dict[str, Any]):
    return await forward_request("/midjourney/v2/variation", "POST", request)

@app.post("/api/saved-jobs", response_model=schemas.SavedJob)
async def save_job(job: schemas.SavedJobCreate, db: Session = Depends(get_db)):
    db_job = models.SavedJob(**job.model_dump())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@app.get("/api/saved-jobs", response_model=List[schemas.SavedJob])
async def list_saved_jobs(db: Session = Depends(get_db)):
    return db.query(models.SavedJob).order_by(models.SavedJob.saved_at.desc()).all()

@app.delete("/api/saved-jobs/{job_id}")
async def delete_saved_job(job_id: UUID, db: Session = Depends(get_db)):
    job = db.query(models.SavedJob).filter(models.SavedJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"status": "success"}

@app.patch("/api/saved-jobs/{job_id}", response_model=schemas.SavedJob)
async def update_job_notes(job_id: UUID, job_update: schemas.SavedJobUpdate, db: Session = Depends(get_db)):
    job = db.query(models.SavedJob).filter(models.SavedJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.notes = job_update.notes
    db.commit()
    db.refresh(job)
    return job

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
