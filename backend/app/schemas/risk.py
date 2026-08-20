from __future__ import annotations

from pydantic import BaseModel, Field


class RiskAssessment(BaseModel):
    # Raw prediction from the trained ML model.
    model_prediction: str

    # Final system-level workflow decision.
    decision: str

    approval_probability: float = Field(
        ge=0.0,
        le=1.0,
    )

    rejection_probability: float = Field(
        ge=0.0,
        le=1.0,
    )

    # Deterministic score calculated from validation findings.
    risk_score: int = Field(
        ge=0,
    )

    # Explains why the system escalated or overrode
    # the ML prediction.
    override_reason: str | None = None
    