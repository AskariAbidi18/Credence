from __future__ import annotations

from pathlib import Path

import joblib
from pypdf import PdfReader
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.pipeline import Pipeline


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = BASE_DIR.parent / "data"

ARTIFACT_DIR = BASE_DIR / "app" / "ml" / "artifacts"

MODEL_PATH = ARTIFACT_DIR / "document_classifier.joblib"


# Existing document folders.
CLASS_FOLDERS = {
    "payslip": "payslips",
    "bank_statement": "bank_statements",
    "tax_return": "tax_returns",
    "kyc": "kyc",
}


# ---------------------------------------------------------------------------
# PDF extraction
# ---------------------------------------------------------------------------

def extract_pdf_text(file_path: str | Path) -> str:
    """
    Extract all text from a PDF using the same mechanism that production
    inference will use.
    """

    file_path = Path(file_path)

    reader = PdfReader(str(file_path))

    pages = []

    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)

    return "\n".join(pages).strip()


# ---------------------------------------------------------------------------
# Training data
# ---------------------------------------------------------------------------

def load_training_data() -> tuple[list[str], list[str]]:
    """
    Load the generated training PDFs.

    Only files named train_*.pdf are included.

    This deliberately excludes the original hand-authored PDFs, which are
    our held-out evaluation set.
    """

    texts: list[str] = []
    labels: list[str] = []

    for label, folder_name in CLASS_FOLDERS.items():

        folder = DATA_DIR / folder_name

        files = sorted(
            folder.glob("train_*.pdf")
        )

        if not files:
            raise FileNotFoundError(
                f"No training PDFs found in {folder}"
            )

        print(
            f"{label:16s}: {len(files)} training PDFs"
        )

        for file_path in files:
            text = extract_pdf_text(file_path)

            if not text.strip():
                raise ValueError(
                    f"Empty extracted text from {file_path}"
                )

            texts.append(text)
            labels.append(label)

    return texts, labels


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def build_model() -> Pipeline:
    """
    Build the document classification pipeline.

    TF-IDF converts document text into numerical features.

    Logistic Regression is used as the classifier because it naturally
    provides class probabilities, which gives us a usable confidence score
    for the first-stage document router.
    """

    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    strip_accents="unicode",
                    ngram_range=(1, 2),
                    min_df=2,
                    max_df=0.98,
                    sublinear_tf=True,
                ),
            ),
            (
                "classifier",
                LogisticRegression(
                    max_iter=2000,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def get_evaluation_documents() -> list[tuple[Path, str]]:
    """
    Return the original PDFs.

    These files are intentionally NOT train_*.pdf.
    """

    documents: list[tuple[Path, str]] = []

    for label, folder_name in CLASS_FOLDERS.items():

        folder = DATA_DIR / folder_name

        for file_path in sorted(folder.glob("*.pdf")):

            if file_path.name.startswith("train_"):
                continue

            documents.append(
                (file_path, label)
            )

    return documents


def evaluate_model(
    model: Pipeline,
) -> None:
    """
    Evaluate the trained classifier against the original hand-authored PDFs.
    """

    evaluation_documents = get_evaluation_documents()

    if not evaluation_documents:
        raise RuntimeError(
            "No evaluation PDFs found."
        )

    texts = [
        extract_pdf_text(path)
        for path, _ in evaluation_documents
    ]

    expected = [
        label
        for _, label in evaluation_documents
    ]

    predicted = model.predict(texts)

    accuracy = accuracy_score(
        expected,
        predicted,
    )

    print()
    print("=" * 60)
    print("FINAL EVALUATION — ORIGINAL PDFs")
    print("=" * 60)

    print(
        f"Documents: {len(evaluation_documents)}"
    )

    print(
        f"Accuracy : {accuracy:.4f}"
    )

    print()
    print("Classification Report:")
    print(
        classification_report(
            expected,
            predicted,
            zero_division=0,
        )
    )

    print("Confusion Matrix:")
    print(
        confusion_matrix(
            expected,
            predicted,
            labels=list(CLASS_FOLDERS.keys()),
        )
    )

    print()
    print("Individual predictions:")

    probabilities = model.predict_proba(texts)

    classes = model.classes_

    for (
        (file_path, expected_label),
        prediction,
        probability_row,
    ) in zip(
        evaluation_documents,
        predicted,
        probabilities,
    ):

        confidence = float(
            max(probability_row)
        )

        print(
            f"  {file_path.parent.name}/{file_path.name}"
        )

        print(
            f"    expected : {expected_label}"
        )

        print(
            f"    predicted: {prediction}"
        )

        print(
            f"    confidence: {confidence:.4f}"
        )

        print()


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train() -> None:
    print("=" * 60)
    print("DOCUMENT CLASSIFIER TRAINING")
    print("=" * 60)

    texts, labels = load_training_data()

    print()
    print(
        f"Total training documents: {len(texts)}"
    )

    model = build_model()

    print()
    print("Training TF-IDF + Logistic Regression...")

    model.fit(
        texts,
        labels,
    )

    print("Training complete.")

    ARTIFACT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        model,
        MODEL_PATH,
    )

    print()
    print(
        f"Model saved to: {MODEL_PATH}"
    )

    evaluate_model(
        model
    )


# ---------------------------------------------------------------------------
# Production prediction
# ---------------------------------------------------------------------------

def load_model() -> Pipeline:
    """
    Load the trained document classifier.
    """

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Document classifier not found at {MODEL_PATH}. "
            "Run training first."
        )

    return joblib.load(
        MODEL_PATH
    )


def classify_document_ml(
    file_path: str | Path,
) -> dict:
    """
    Classify an unseen PDF.

    This is the function the Credence application will eventually call.
    """

    model = load_model()

    text = extract_pdf_text(
        file_path
    )

    if not text:
        raise ValueError(
            f"No text could be extracted from {file_path}"
        )

    prediction = model.predict(
        [text]
    )[0]

    probabilities = model.predict_proba(
        [text]
    )[0]

    classes = model.classes_

    probability_map = {
        str(label): float(probability)
        for label, probability
        in zip(classes, probabilities)
    }

    confidence = max(
        probability_map.values()
    )

    return {
        "document_type": str(prediction),
        "confidence": float(confidence),
        "probabilities": probability_map,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    train()
    