"""
FastAPI Main Application Entry Point for Credence.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.upload import router as upload_router

app = FastAPI(
    title="Credence Document Processing API",
    description="Intelligent Loan Document Review & Approval System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Credence API",
        "docs_url": "/docs",
        "csv_storage": "extracted_documents.csv",
    }
