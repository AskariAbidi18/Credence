from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Recommendation(str, Enum):
    APPROVE = "approve"
    REVIEW = "review"
    REJECT = "reject"


class ApplicantProfile(BaseModel):
    name: str | None = None
    employer: str | None = None
    monthly_income: float | None = None
    currency: str | None = None


class LoanSummary(BaseModel):
    application_id: str

    applicant_profile: ApplicantProfile

    income_assessment: str
    overall_assessment: str

    risk_level: RiskLevel

    flags: list[str] = Field(default_factory=list)

    missing_documents: list[str] = Field(default_factory=list)

    recommendation: Recommendation

    reviewer_summary: str

    model_risk: str

    review_required: bool

    review_reasons: list[str] = Field(default_factory=list)
