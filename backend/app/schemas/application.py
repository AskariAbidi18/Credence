from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.documents import ExtractedDocument
from app.schemas.risk import RiskAssessment
from app.schemas.summary import LoanSummary
from app.schemas.validation import ValidationResult


class ApplicationStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    REVIEW_REQUIRED = "review_required"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"


class LoanType(str, Enum):
    PERSONAL = "personal"
    HOME = "home"
    EDUCATION = "education"
    VEHICLE = "vehicle"
    BUSINESS = "business"
    OTHER = "other"


class LoanApplicationData(BaseModel):
    """
    Structured data required by the loan risk model.

    Values can come from applicant input, uploaded documents,
    or validated extraction.
    """

    no_of_dependents: int | None = Field(
        default=None,
        ge=0,
    )

    education: str | None = None

    self_employed: str | None = None

    income_annum: float | None = Field(
        default=None,
        ge=0,
    )

    loan_amount: float | None = Field(
        default=None,
        ge=0,
    )

    loan_term: int | None = Field(
        default=None,
        ge=1,
    )

    cibil_score: int | None = Field(
        default=None,
        ge=0,
        le=900,
    )

    residential_assets_value: float | None = Field(
        default=None,
        ge=0,
    )

    commercial_assets_value: float | None = Field(
        default=None,
        ge=0,
    )

    luxury_assets_value: float | None = Field(
        default=None,
        ge=0,
    )

    bank_asset_value: float | None = Field(
        default=None,
        ge=0,
    )


class ApplicationCreate(BaseModel):
    applicant_name: str | None = None

    loan_type: LoanType | None = None

    loan_data: LoanApplicationData | None = None


class ApplicationResponse(BaseModel):
    id: str
    status: str

    applicant_name: str | None = None

    loan_type: LoanType | None = None

    loan_data: LoanApplicationData | None = None

    documents: list[ExtractedDocument] = Field(
        default_factory=list
    )

    validation: ValidationResult | None = None

    summary: LoanSummary | None = None

    risk_assessment: RiskAssessment | None = None

    created_at: datetime
    updated_at: datetime
