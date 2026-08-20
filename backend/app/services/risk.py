from __future__ import annotations

from math import isfinite

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


def _validate_risk_input(application: dict) -> None:
    """
    Defensive validation before data reaches the ML model.

    This protects the prediction layer even if invalid data reaches the
    application through an existing database record or another code path
    that bypasses the Pydantic API schema.
    """

    missing = sorted(
        feature
        for feature in REQUIRED_FEATURES
        if (
            feature not in application
            or application[feature] is None
        )
    )

    if missing:
        raise RiskAssessmentError(
            f"Missing required loan application fields: {missing}"
        )

    numeric_fields = [
        "no_of_dependents",
        "income_annum",
        "loan_amount",
        "loan_term",
        "cibil_score",
        "residential_assets_value",
        "commercial_assets_value",
        "luxury_assets_value",
        "bank_asset_value",
    ]

    for field in numeric_fields:
        value = application[field]

        if not isinstance(value, (int, float)):
            raise RiskAssessmentError(
                f"Invalid value for '{field}': expected a number."
            )

        if not isfinite(value):
            raise RiskAssessmentError(
                f"Invalid value for '{field}': must be finite."
            )

    if application["no_of_dependents"] < 0:
        raise RiskAssessmentError(
            "Number of dependents cannot be negative."
        )

    if application["income_annum"] <= 0:
        raise RiskAssessmentError(
            "Annual income must be greater than zero."
        )

    if application["loan_amount"] <= 0:
        raise RiskAssessmentError(
            "Loan amount must be greater than zero."
        )

    if application["loan_term"] < 1:
        raise RiskAssessmentError(
            "Loan term must be at least 1."
        )

    if not 300 <= application["cibil_score"] <= 900:
        raise RiskAssessmentError(
            "CIBIL score must be between 300 and 900."
        )

    if not str(application["education"]).strip():
        raise RiskAssessmentError(
            "Education must not be empty."
        )

    if not str(application["self_employed"]).strip():
        raise RiskAssessmentError(
            "Employment status must not be empty."
        )

    asset_fields = [
        "residential_assets_value",
        "commercial_assets_value",
        "luxury_assets_value",
        "bank_asset_value",
    ]

    for field in asset_fields:
        if application[field] < 0:
            raise RiskAssessmentError(
                f"'{field}' cannot be negative."
            )


def calculate_risk_score(validation_flags) -> tuple[int, list[str]]:
    """
    Calculate a deterministic risk score from validation findings.

    Scoring policy:

    - Missing required document: +1
    - Warning: +1
    - Critical: +3

    Some high-risk financial conditions receive additional
    weighting based on their specific title.
    """

    score = 0
    reasons = []

    for flag in validation_flags:

        severity = (
            flag.severity
            if isinstance(flag.severity, str)
            else flag.severity.value
        )

        title = flag.title.lower()

        # ---------------------------------------------------------
        # Base severity score
        # ---------------------------------------------------------

        if severity == "critical":
            score += 3
            reasons.append(flag.reason)

        elif severity == "warning":
            score += 1
            reasons.append(flag.reason)

        # ---------------------------------------------------------
        # Additional financial risk weighting
        # ---------------------------------------------------------

        if "very low cibil" in title:
            score += 2

        elif "low cibil" in title:
            score += 1

        if "high loan-to-income" in title:
            score += 1

        if "no declared assets" in title:
            score += 1

        if "inconsistency" in title:
            score += 2

    return score, reasons


def determine_system_decision(
    *,
    model_prediction: str,
    risk_score: int,
    reasons: list[str],
) -> tuple[str, str | None]:
    """
    Combine the ML prediction with deterministic risk policy.

    Decision policy:

    Score 0:
        ML model determines the final decision.

    Score 1-4:
        Application requires manual review.

    Score 5+:
        Application is rejected by the system.
    """

    if risk_score >= 5:
        return (
            "Rejected",
            (
                "The application was rejected because multiple "
                "financial or validation risk indicators exceeded "
                "the configured risk threshold."
            ),
        )

    if risk_score >= 1:
        return (
            "Review Required",
            (
                "The application requires manual review because "
                f"{len(reasons)} risk indicator(s) were detected."
            ),
        )

    return model_prediction, None


def assess_loan_risk(
    application: dict,
    validation_flags=None,
) -> dict:
    """
    Run the trained ML model and combine its prediction with
    deterministic validation-based risk scoring.
    """

    _validate_risk_input(application)

    try:
        result = predict_loan(application)

    except LoanPredictionError as exc:
        raise RiskAssessmentError(
            str(exc)
        ) from exc

    validation_flags = validation_flags or []

    risk_score, reasons = calculate_risk_score(
        validation_flags
    )

    model_prediction = result["prediction"]

    decision, override_reason = determine_system_decision(
        model_prediction=model_prediction,
        risk_score=risk_score,
        reasons=reasons,
    )

    return {
        "model_prediction": model_prediction,
        "decision": decision,
        "approval_probability": result["approval_probability"],
        "rejection_probability": result["rejection_probability"],
        "risk_score": risk_score,
        "override_reason": override_reason,
    }
