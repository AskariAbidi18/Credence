from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.documents import ExtractedDocument
from app.schemas.summary import LoanSummary
from app.schemas.validation import ValidationResult


class ApplicationStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    REVIEW_REQUIRED = "review_required"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"


class ApplicationCreate(BaseModel):
    applicant_name: str | None = None


class ApplicationResponse(BaseModel):
    id: str
    status: str

    documents: list[ExtractedDocument] = Field(default_factory=list)

    validation: ValidationResult | None = None

    summary: LoanSummary | None = None

    created_at: datetime
    updated_at: datetime
