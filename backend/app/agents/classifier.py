"""
Classifier agent (handoff section 6, build order step 2).

Given a single uploaded document, decides which DocumentType it is and how
confident the model is. Deterministic downstream logic (not this agent)
decides what to do with a low-confidence result.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import ValidationError

from app.schemas.documents import ClassificationResult, DocumentType
from app.services.claude import call_claude_on_document, extract_json

CLASSIFIER_PROMPT = """You are a document classification agent for a loan \
application system.

Look at the attached document and classify it into exactly one of these \
four categories:

- payslip
- bank_statement
- tax_return
- kyc

Use "kyc" for any identity document (ID card, passport, driver's license, \
proof of address used for identity verification).

Respond with ONLY a JSON object in this exact shape, no other text, no \
markdown fences:

{"document_type": "<one of the four values above>", "confidence": <float 0.0-1.0>}

The confidence should reflect how certain you are given the document's \
content and legibility, not just whether you found a category to assign. \
If the document is blurry, cropped, or ambiguous, lower your confidence \
accordingly rather than guessing with false certainty."""

# Below this, the document should be routed to manual review instead of
# trusted automatically. Used by the orchestrator, not enforced here.
LOW_CONFIDENCE_THRESHOLD = 0.6


async def classify_document(file_path: str | Path) -> ClassificationResult:
    """
    Classify a single document file. Raises ValueError if Claude's response
    can't be parsed into a valid ClassificationResult — callers should catch
    this and route the document to manual review rather than crash the
    pipeline on one bad file.
    """
    raw_response = await call_claude_on_document(file_path, CLASSIFIER_PROMPT)

    try:
        payload = extract_json(raw_response)
        return ClassificationResult.model_validate(payload)
    except (ValueError, ValidationError) as exc:
        raise ValueError(
            f"Classifier returned an invalid response for {file_path}: "
            f"{raw_response!r}"
        ) from exc


def needs_manual_classification(result: ClassificationResult) -> bool:
    return result.confidence < LOW_CONFIDENCE_THRESHOLD
