"""
FastAPI Main Application Entry Point for Credence.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.applications import router as applications_router
from app.api.upload import router as upload_router

from app.db.database import Base, engine
from app.db import models  # noqa: F401

app = FastAPI(
    title="Credence Document Processing API",
    description="Intelligent Loan Document Review & Approval System",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(applications_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Credence API",
        "docs_url": "/docs",
        "csv_storage": "extracted_documents.csv",
    }
