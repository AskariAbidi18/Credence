from __future__ import annotations

from app.ml.predict import (
    LoanPredictionError,
    predict_loan,
)


class RiskAssessmentError(RuntimeError):
    """Raised when a loan risk assessment cannot be performed."""


REQUIRED_FEATURES = {
    "no_of_dependents",
    "education",
    "self_employed",
    "income_annum",
    "loan_amount",
    "loan_term",
    "cibil_score",
    "residential_assets_value",
    "commercial_assets_value",
    "luxury_assets_value",
    "bank_asset_value",
}


def assess_loan_risk(application: dict) -> dict:
    """
    Run the trained loan approval model against an application.

    The model remains the source of truth for the approval/rejection
    prediction. This service only validates the input and exposes the
    model result in a clean application-level structure.
    """

    missing = sorted(
        REQUIRED_FEATURES - application.keys()
    )

    if missing:
        raise RiskAssessmentError(
            f"Missing required loan application fields: {missing}"
        )

    try:
        result = predict_loan(application)
    except LoanPredictionError as exc:
        raise RiskAssessmentError(
            str(exc)
        ) from exc

    return {
        "decision": result["prediction"],
        "approval_probability": result["approval_probability"],
        "rejection_probability": result["rejection_probability"],
    }
