"""
Upload & Process API Router for Credence.

Processes uploaded document files, runs classification + extraction, and saves
all extracted records into a CSV file.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.agents.classifier import classify_document
from app.agents.extractors import extract_document
from app.schemas.documents import ExtractedDocument
from app.services.csv_storage import save_extraction_to_csv

router = APIRouter(prefix="/api", tags=["Document Upload"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=ExtractedDocument)
async def upload_document(file: UploadFile = File(...)) -> ExtractedDocument:
    """
    Upload a document file, extract all information, and save to CSV.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # 1. Classify
        classification = await classify_document(file_path)

        # 2. Extract
        extracted = await extract_document(
            file_path,
            classification.document_type,
            classification.confidence,
        )

        # 3. Save to CSV
        save_extraction_to_csv(extracted)

        return extracted
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document '{file.filename}': {exc}",
        ) from exc
