from __future__ import annotations

from pathlib import Path

import pandas as pd


DATASET_PATH = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "loan_approval"
    / "loan_approval_dataset.csv"
)

TARGET_COLUMN = "loan_status"

FEATURE_COLUMNS = [
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
]

CATEGORICAL_FEATURES = [
    "education",
    "self_employed",
]

NUMERICAL_FEATURES = [
    feature
    for feature in FEATURE_COLUMNS
    if feature not in CATEGORICAL_FEATURES
]


def load_dataset() -> pd.DataFrame:
    df = pd.read_csv(DATASET_PATH)

    # The source CSV contains leading whitespace in column names.
    df.columns = df.columns.str.strip()

    return df


def prepare_dataset() -> tuple[pd.DataFrame, pd.Series]:
    df = load_dataset()

    missing_columns = set(FEATURE_COLUMNS + [TARGET_COLUMN]) - set(df.columns)

    if missing_columns:
        raise ValueError(
            f"Dataset is missing required columns: {sorted(missing_columns)}"
        )

    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].astype(str).str.strip()

    return X, y
