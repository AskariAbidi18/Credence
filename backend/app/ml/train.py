from __future__ import annotations

from pathlib import Path
from xml.parsers.expat import model

import joblib

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.ml.features import (
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    prepare_dataset,
)


MODEL_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "loan_approval_model.joblib"


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "numeric",
                StandardScaler(),
                NUMERICAL_FEATURES,
            ),
            (
                "categorical",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
                CATEGORICAL_FEATURES,
            ),
        ]
    )


def build_logistic_regression() -> Pipeline:
    return Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            (
                "classifier",
                LogisticRegression(
                    max_iter=2000,
                    random_state=42,
                ),
            ),
        ]
    )


def build_random_forest() -> Pipeline:
    return Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=300,
                    max_depth=None,
                    min_samples_leaf=2,
                    class_weight="balanced",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )


def evaluate_model(
    name: str,
    model: Pipeline,
    X_test,
    y_test,
) -> dict:
    predictions = model.predict(X_test)
    approved_index = list(model.classes_).index("Approved")
    probabilities = model.predict_proba(X_test)[:, approved_index]

    accuracy = accuracy_score(y_test, predictions)
    f1 = f1_score(
        y_test,
        predictions,
        pos_label="Approved",
    )
    roc_auc = roc_auc_score(
        (y_test == "Approved").astype(int),
        probabilities,
    )

    print(f"\n{'=' * 60}")
    print(name)
    print(f"{'=' * 60}")

    print(f"Accuracy : {accuracy:.4f}")
    print(f"F1       : {f1:.4f}")
    print(f"ROC-AUC  : {roc_auc:.4f}")

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, predictions))

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            predictions,
            digits=4,
        )
    )

    return {
        "name": name,
        "accuracy": accuracy,
        "f1": f1,
        "roc_auc": roc_auc,
    }


def main() -> None:
    X, y = prepare_dataset()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    print(f"Training samples: {len(X_train)}")
    print(f"Testing samples : {len(X_test)}")

    models = {
        "Logistic Regression": build_logistic_regression(),
        "Random Forest": build_random_forest(),
    }

    results = []

    for name, model in models.items():
        model.fit(X_train, y_train)

        results.append(
            evaluate_model(
                name,
                model,
                X_test,
                y_test,
            )
        )

    # Select based on F1 first, then ROC-AUC.
    best_result = max(
        results,
        key=lambda result: (
            result["f1"],
            result["roc_auc"],
        ),
    )

    best_model = models[best_result["name"]]

    joblib.dump(best_model, MODEL_PATH)

    print(f"\nBest model: {best_result['name']}")
    print(f"Saved to: {MODEL_PATH}")


if __name__ == "__main__":
    main()
