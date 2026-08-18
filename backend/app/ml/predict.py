from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd

from app.ml.features import FEATURE_COLUMNS


MODEL_PATH = (
    Path(__file__).resolve().parent
    / "artifacts"
    / "loan_approval_model.joblib"
)


class LoanPredictionError(RuntimeError):
    """Raised when loan prediction cannot be performed."""


def load_model():
    if not MODEL_PATH.exists():
        raise LoanPredictionError(
            f"Trained model not found: {MODEL_PATH}"
        )

    return joblib.load(MODEL_PATH)


def predict_loan(application: dict) -> dict:
    missing = [
        feature
        for feature in FEATURE_COLUMNS
        if feature not in application
    ]

    if missing:
        raise LoanPredictionError(
            f"Missing model features: {missing}"
        )

    features = pd.DataFrame(
        [
            {
                feature: application[feature]
                for feature in FEATURE_COLUMNS
            }
        ]
    )

    model = load_model()

    prediction = model.predict(features)[0]

    probabilities = model.predict_proba(features)[0]

    classes = list(model.classes_)

    approved_index = classes.index("Approved")
    rejected_index = classes.index("Rejected")

    return {
        "prediction": prediction,
        "approval_probability": float(
            probabilities[approved_index]
        ),
        "rejection_probability": float(
            probabilities[rejected_index]
        ),
    }
