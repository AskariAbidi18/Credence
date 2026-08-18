"""
Extraction agent (handoff section 7, build order step 3).

For a classified document, extracts the type-specific fields defined in
app.schemas.documents and wraps them in the shared ExtractedDocument
contract. This is the primary interface handed off to the core-backend
half of the team (orchestration, validation, summary, dashboard).
"""

from __future__ import annotations

import uuid
from pathlib import Path

from pydantic import BaseModel, ValidationError

from app.schemas.documents import (
    DOCUMENT_TYPE_TO_SCHEMA,
    DocumentType,
    ExtractedDocument,
)
from app.services.llm import analyze_document, extract_json

# Field-by-field instructions per document type. Keep these in sync with
# the schemas in app/schemas/documents.py — if you add a field there, add
# it to the matching prompt here.
_EXTRACTION_FIELDS: dict[DocumentType, str] = {
    DocumentType.PAYSLIP: (
        "employee_name, employer, period, gross_pay, net_pay, currency, "
        "deductions"
    ),
    DocumentType.BANK_STATEMENT: (
        "account_holder, account_number_last4 (last 4 digits ONLY, never "
        "the full account number), statement_period, opening_balance, "
        "closing_balance, average_balance, total_deposits, "
        "total_withdrawals, transactions_count, currency"
    ),
    DocumentType.TAX_RETURN: (
        "taxpayer_name, tax_year, declared_income, taxable_income, "
        "tax_paid, currency"
    ),
    DocumentType.KYC: (
        "full_name, date_of_birth, document_type, document_number_last4 "
        "(last 4 digits ONLY, never the full document number), address, "
        "expiry_date"
    ),
}


def _build_prompt(document_type: DocumentType) -> str:
    fields = _EXTRACTION_FIELDS[document_type]
    return f"""You are a document extraction agent for a loan application \
system. The attached document has already been classified as: \
{document_type.value}.

Extract exactly these fields: {fields}.

Rules:
- If a field is missing, illegible, or not present in the document, set \
it to null. Never guess or fabricate a value.
- Numeric fields must be plain numbers (no currency symbols, no commas).
- Only include the last 4 digits of any account or document number \
fields — never the full number.
- Also return "extraction_confidence": a float 0.0-1.0 reflecting how \
confident you are in the extraction as a whole.

Respond with ONLY a JSON object of this shape, no other text, no markdown \
fences:

{{"data": {{<the fields above>}}, "extraction_confidence": <float>}}"""


async def extract_document(
    file_path: str | Path,
    document_type: DocumentType,
    classification_confidence: float,
) -> ExtractedDocument:
    """
    Extract structured fields from a document already classified as
    `document_type`. Never raises on a bad model response — instead
    returns an ExtractedDocument with extraction_status="failed" so one
    unreadable document doesn't take down the whole application pipeline.
    """
    path = Path(file_path)
    document_id = f"doc_{uuid.uuid4().hex[:8]}"

    schema: type[BaseModel] = DOCUMENT_TYPE_TO_SCHEMA[document_type]
    prompt = _build_prompt(document_type)

    try:
        raw_response = await analyze_document(path, prompt)
        payload = extract_json(raw_response)

        validated_data = schema.model_validate(payload.get("data", {}))
        extraction_confidence = payload.get("extraction_confidence")

        return ExtractedDocument(
            document_id=document_id,
            filename=path.name,
            document_type=document_type,
            classification_confidence=classification_confidence,
            extraction_confidence=extraction_confidence,
            data=validated_data.model_dump(),
            extraction_status="success",
        )

    except (ValueError, ValidationError):
        return ExtractedDocument(
            document_id=document_id,
            filename=path.name,
            document_type=document_type,
            classification_confidence=classification_confidence,
            extraction_confidence=None,
            data={},
            extraction_status="failed",
        )
