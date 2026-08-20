from __future__ import annotations

import json

from app.schemas.summary import LoanSummary
from app.services.llm import (
    _get_client,
    MODEL_NAME,
    extract_json,
)


class SummaryGenerationError(RuntimeError):
    """Raised when an application summary cannot be generated."""


async def generate_application_summary(
    application,
) -> LoanSummary:
    """
    Generate an explainable reviewer summary for an application.

    The ML model provides a raw prediction.

    The validation engine and deterministic risk scoring layer determine
    the final workflow decision.

    The LLM does not make lending decisions. It only explains the
    final decision and the factors that led to it.
    """

    # ---------------------------------------------------------------
    # Ensure risk assessment exists
    # ---------------------------------------------------------------

    if not application.risk_assessment:
        raise SummaryGenerationError(
            "Risk assessment must be completed before generating a summary."
        )

    risk = application.risk_assessment or {}

    # ---------------------------------------------------------------
    # Extract risk assessment data
    # ---------------------------------------------------------------

    model_prediction = risk.get(
        "model_prediction",
        risk.get("decision", "Unknown"),
    )

    final_decision = risk.get(
        "decision",
        "Review Required",
    )

    approval_probability = float(
        risk.get("approval_probability", 0.0)
    )

    rejection_probability = float(
        risk.get("rejection_probability", 0.0)
    )

    risk_score = int(
        risk.get("risk_score", 0)
    )

    override_reason = risk.get(
        "override_reason"
    )

    # Normalize decision so both:
    #
    # "Review Required"
    # "review_required"
    #
    # work correctly.

    normalized_decision = (
        str(final_decision)
        .lower()
        .replace("_", " ")
        .strip()
    )

    # ---------------------------------------------------------------
    # Collect deterministic validation findings
    # ---------------------------------------------------------------

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

    missing_documents = [
        flag.expected
        for flag in application.validation_flags
        if (
            flag.category == "document_completeness"
            and flag.expected
        )
    ]

    review_reasons = []

    if override_reason:
        review_reasons.append(override_reason)

    review_reasons.extend(
        flag.reason
        for flag in application.validation_flags
        if flag.reason
    )

    # ---------------------------------------------------------------
    # Collect uploaded document information
    # ---------------------------------------------------------------

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

    # ---------------------------------------------------------------
    # Determine model risk level
    #
    # This represents ML confidence only.
    # It is NOT the final workflow decision.
    # ---------------------------------------------------------------

    if approval_probability >= 0.80:
        model_risk = "low"

    elif approval_probability >= 0.60:
        model_risk = "medium"

    else:
        model_risk = "high"

    # ---------------------------------------------------------------
    # Build structured payload for the LLM
    # ---------------------------------------------------------------

    payload = {
        "applicant_name": application.applicant_name,
        "loan_type": application.loan_type,
        "loan_data": application.loan_data or {},

        "risk_assessment": {
            "model_prediction": model_prediction,
            "final_decision": final_decision,
            "approval_probability": approval_probability,
            "rejection_probability": rejection_probability,
            "risk_score": risk_score,
            "override_reason": override_reason,
        },

        "validation": {
            "flags": validation_flags,
            "missing_documents": missing_documents,
        },

        "documents": documents,
    }

    # ---------------------------------------------------------------
    # LLM prompt
    # ---------------------------------------------------------------

    prompt = f"""
You are generating a concise, professional reviewer summary for a loan
application.

Your role is to explain the supplied application, document validation,
and risk assessment results for a human reviewer.

IMPORTANT RULES:

1. Do NOT make an independent loan approval or rejection decision.
2. The supplied risk assessment and validation results are authoritative.
3. Use ONLY information present in the supplied application data.
4. Do NOT invent financial facts, ratios, calculations, assets,
   liabilities, employment details, or document findings.
5. Do NOT mention loan-to-value ratio unless the supplied data explicitly
   contains a valid collateral or LTV calculation.
6. Do NOT claim a debt-to-income ratio unless that ratio is explicitly
   supplied or calculated in the application data.
7. Do NOT describe the ML model, deterministic validation logic, model
   internals, or implementation details unless necessary to explain a
   result.
8. Avoid repetitive wording across overall_assessment,
   income_assessment, and reviewer_summary.
9. Use clear, natural language suitable for a financial reviewer.
10. If validation findings exist, explain the relevant discrepancies or
    missing documents clearly.
11. If there are no validation findings or missing documents, explicitly
    state that the submitted documents are consistent with the available
    application information.
12. The recommendation must follow this workflow:
    - "approve" only when the risk decision is Approved and there are no
      validation findings or missing required documents.
    - "reject" only when the risk decision is Rejected.
    - otherwise use "review".

FIELD-SPECIFIC INSTRUCTIONS:

income_assessment:
- Focus only on income and employment information that is present in the
  supplied data.
- Compare income information across the application and submitted
  documents when available.
- Do not invent affordability ratios or financial calculations.

overall_assessment:
- Provide a concise assessment of the applicant's overall profile.
- Consider the supplied credit score, financial information, validation
  outcome, and risk assessment.
- Do not repeat detailed implementation or model information.

reviewer_summary:
- Provide a concise final summary for a human reviewer.
- State the recommendation and the main reasons supporting it.
- Mention validation issues or missing documents when present.
- Avoid repeating entire sentences from the other assessment fields.

STYLE:

- Professional and concise.
- Use Indian currency formatting such as ₹12,00,000 when referring to
  INR amounts.
- Do not use unnecessary technical jargon.
- Do not use phrases such as "the ML model predicted" or
  "deterministic risk scoring".
- Do not mention internal system architecture or implementation details.
- Do not exaggerate financial strength or use unsupported claims such as
  "substantial assets" unless the supplied values clearly support that
  statement.

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

Determine risk_level using the supplied risk assessment and validation
findings, but do not alter the underlying risk decision.

APPLICATION DATA:

{json.dumps(payload, indent=2, default=str)}
"""

    # ---------------------------------------------------------------
    # Call LLM
    # ---------------------------------------------------------------

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
                        "Return ONLY valid JSON. Do not output reasoning, "
                        "analysis, markdown, or think tags."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0,
            reasoning_effort="none",
            response_format={"type": "json_object"},
            max_completion_tokens=2048,
        )

    except Exception as exc:
        raise SummaryGenerationError(
            f"LLM request failed: {exc}"
        ) from exc

    # ---------------------------------------------------------------
    # Validate LLM response
    # ---------------------------------------------------------------

    content = response.choices[0].message.content

    if not content:
        raise SummaryGenerationError(
            "LLM returned an empty response."
        )

    print("\n========== RAW LLM SUMMARY RESPONSE ==========")
    print(content)
    print("==============================================\n")

    try:
        data = extract_json(content)

        summary = LoanSummary(
            application_id=application.id,

            model_risk=model_risk,

            review_required=(
                normalized_decision == "review required"
            ),

            review_reasons=review_reasons,

            **data,
        )

    except Exception as exc:
        raise SummaryGenerationError(
            f"Invalid LLM summary response: {exc}"
        ) from exc

    # ---------------------------------------------------------------
    # Deterministic recommendation enforcement
    #
    # The LLM is NEVER allowed to change the final decision.
    # ---------------------------------------------------------------

    if normalized_decision == "approved":

        summary.recommendation = "approve"

    elif normalized_decision == "rejected":

        summary.recommendation = "reject"

    else:

        summary.recommendation = "review"

    # ---------------------------------------------------------------
    # Deterministic validation data
    #
    # Do not trust the LLM to reproduce these perfectly.
    # ---------------------------------------------------------------

    summary.missing_documents = missing_documents

    summary.flags = [
        flag.title
        for flag in application.validation_flags
    ]

    # ---------------------------------------------------------------
    # Decision metadata
    # ---------------------------------------------------------------

    summary.model_risk = model_risk

    summary.review_required = (
        normalized_decision == "review required"
    )

    summary.review_reasons = review_reasons

    return summary
