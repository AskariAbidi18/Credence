from __future__ import annotations

import json

from tensorboard import summary

from app.schemas.summary import LoanSummary
from app.services.llm import (
    LLMServiceError,
    _get_client,
    MODEL_NAME,
    GROQ_BASE_URL,
    extract_json,
)
from app.schemas import application


class SummaryGenerationError(RuntimeError):
    """Raised when an application summary cannot be generated."""


async def generate_application_summary(
    application,
) -> LoanSummary:
    """
    Generate an explainable reviewer summary for an application.

    The LLM explains the deterministic outputs from the risk model
    and validation engine. It does not make the underlying decision.
    """

    if not application.risk_assessment:
        raise SummaryGenerationError(
            "Risk assessment must be completed before generating a summary."
        )

    risk = application.risk_assessment

    validation_flags = [
        {
            "category": flag.category,
            "severity": flag.severity,
            "title": flag.title,
            "reason": flag.reason,
            "documents_involved": flag.documents_involved,
            "expected": flag.expected,
            "observed": flag.observed,
        }
        for flag in application.validation_flags
    ]

    documents = [
        {
            "filename": document.filename,
            "document_type": document.document_type,
            "classification_confidence": (
                document.classification_confidence
            ),
            "extraction_confidence": (
                document.extraction_confidence
            ),
            "data": document.extracted_data,
        }
        for document in application.documents
    ]

    missing_documents = [
        flag.expected
        for flag in application.validation_flags
        if (
            flag.category == "document_completeness"
            and flag.expected
        )
    ]

    review_reasons = [
        flag.title
        for flag in application.validation_flags
    ]

    review_required = bool(review_reasons)

    approval_probability = float(
        risk["approval_probability"]
    )

    if approval_probability >= 0.80:
        model_risk = "low"
    elif approval_probability >= 0.60:
        model_risk = "medium"
    else:
        model_risk = "high"

    payload = {
        "applicant_name": application.applicant_name,
        "loan_type": application.loan_type,
        "loan_data": application.loan_data or {},
        "risk_assessment": risk,
        "validation": {
            "flags": validation_flags,
            "missing_documents": missing_documents,
        },
        "documents": documents,
    }

    prompt = f"""
You are generating a concise reviewer summary for a loan application.

IMPORTANT RULES:

1. Do NOT make a new loan approval/rejection decision.
2. The risk model's decision is authoritative.
3. Validation findings are authoritative.
4. Explain the existing results using only the supplied data.
5. Do not invent financial information.
6. Do not change the risk model decision.
7. If there are validation issues, clearly explain them.
8. If documents are missing, mention them.
9. The recommendation must reflect the workflow:
   - "approve" only when the risk model approved AND there are
     no missing documents or serious validation issues.
   - "reject" only when the risk model rejected.
   - otherwise use "review".

Return ONLY valid JSON with exactly these fields:

{{
  "applicant_profile": {{
    "name": null,
    "employer": null,
    "monthly_income": null,
    "currency": null
  }},
  "income_assessment": "string",
  "overall_assessment": "string",
  "risk_level": "low | medium | high",
  "flags": ["string"],
  "missing_documents": ["string"],
  "recommendation": "approve | review | reject",
  "reviewer_summary": "string"
}}

Determine risk_level from the supplied risk probability and
validation findings, but do not alter the underlying model decision.

APPLICATION DATA:

{json.dumps(payload, indent=2, default=str)}
"""

    try:
        client = _get_client()

        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are the explanation and review-summary "
                        "component of the Credence loan processing "
                        "system. You explain deterministic outputs. "
                        "You do not make independent lending decisions. "
                        "Return JSON only."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0,
        )

    except Exception as exc:
        raise SummaryGenerationError(
            f"LLM request failed: {exc}"
        ) from exc

    content = response.choices[0].message.content

    if not content:
        raise SummaryGenerationError(
            "LLM returned an empty response."
        )

    try:
        data = extract_json(content)

        summary = LoanSummary(
            application_id=application.id,
            model_risk=model_risk,
            review_required=review_required,
            review_reasons=review_reasons,
            **data,
        )

    except Exception as exc:
        raise SummaryGenerationError(
            f"Invalid LLM summary response: {exc}"
        ) from exc

    # ---------------------------------------------------------------
    # Safety checks
    # ---------------------------------------------------------------

    model_decision = risk["decision"].lower()

    # The LLM is not allowed to contradict the risk model.
    if model_decision == "rejected":
        summary.recommendation = "reject"

    elif model_decision == "approved":
        if missing_documents or validation_flags:
            summary.recommendation = "review"
        else:
            summary.recommendation = "approve"

    else:
        summary.recommendation = "review"

    # Missing documents are deterministic. Don't trust the LLM
    # to reproduce them perfectly.
    summary.missing_documents = missing_documents

    # Validation flags are also deterministic.
    summary.flags = [
        flag.title
        for flag in application.validation_flags
    ]

    summary.model_risk = model_risk
    summary.review_required = review_required
    summary.review_reasons = review_reasons

    return summary
