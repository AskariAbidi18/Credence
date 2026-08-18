from __future__ import annotations

from pydantic import BaseModel, Field


class RiskAssessment(BaseModel):
    decision: str

    approval_probability: float = Field(
        ge=0.0,
        le=1.0,
    )

    rejection_probability: float = Field(
        ge=0.0,
        le=1.0,
    )
    