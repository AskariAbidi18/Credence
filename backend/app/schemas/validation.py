from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class ValidationSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ValidationCategory(str, Enum):
    IDENTITY = "identity"
    INCOME = "income"
    DOCUMENT_COMPLETENESS = "document_completeness"
    DOCUMENT_QUALITY = "document_quality"
    CONSISTENCY = "consistency"


class ValidationFlag(BaseModel):
    category: ValidationCategory
    severity: ValidationSeverity

    title: str
    reason: str

    documents_involved: list[str] = Field(default_factory=list)

    expected: str | None = None
    observed: str | None = None


class ValidationResult(BaseModel):
    application_id: str

    passed: bool

    flags: list[ValidationFlag] = Field(default_factory=list)

    missing_documents: list[str] = Field(default_factory=list)

    validation_confidence: float = Field(
        ge=0.0,
        le=1.0,
    )
    