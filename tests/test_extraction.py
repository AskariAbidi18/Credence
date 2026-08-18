"""
Tests for the extraction agent. Requires GROQ_API_KEYto be set —
these make real API calls against the synthetic documents in data/, they
are not mocked. Run with: pytest tests/test_extraction.py -v
"""

from pathlib import Path

import pytest

from app.agents.extractors import extract_document
from app.schemas.documents import DocumentType

DATA_DIR = Path(__file__).parent.parent / "data"


@pytest.mark.asyncio
async def test_extracts_payslip_fields():
    result = await extract_document(
        DATA_DIR / "payslips" / "priya_payslip.pdf",
        DocumentType.PAYSLIP,
        classification_confidence=0.95,
    )
    assert result.extraction_status == "success"
    assert result.data["employee_name"] == "Priya Nair"
    assert result.data["net_pay"] == 80000


@pytest.mark.asyncio
async def test_extracts_bank_statement_masks_account_number():
    result = await extract_document(
        DATA_DIR / "bank_statements" / "priya_bank.pdf",
        DocumentType.BANK_STATEMENT,
        classification_confidence=0.9,
    )
    assert result.extraction_status == "success"
    # Only last 4 digits should ever be stored -- never a full account number.
    assert len(result.data["account_number_last4"] or "") <= 4


@pytest.mark.asyncio
async def test_extracts_messy_applicant_bank_statement():
    """The Rahul Sharma bank statement has a slightly different name --
    extraction should still succeed even though validation (a later agent)
    will flag the mismatch."""
    result = await extract_document(
        DATA_DIR / "bank_statements" / "rahul_bank.pdf",
        DocumentType.BANK_STATEMENT,
        classification_confidence=0.9,
    )
    assert result.extraction_status == "success"
    assert "Rahul" in (result.data["account_holder"] or "")


@pytest.mark.asyncio
async def test_extraction_result_matches_contract_shape():
    result = await extract_document(
        DATA_DIR / "kyc" / "arjun_kyc.pdf",
        DocumentType.KYC,
        classification_confidence=0.88,
    )
    assert result.document_id.startswith("doc_")
    assert result.document_type == DocumentType.KYC
    assert result.extraction_status in {"success", "partial", "failed"}
    assert isinstance(result.data, dict)
