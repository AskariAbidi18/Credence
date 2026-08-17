"""
Tests for the classifier agent. Requires ANTHROPIC_API_KEY to be set —
these make real API calls against the synthetic documents in data/, they
are not mocked. Run with: pytest tests/test_classifier.py -v
"""

from pathlib import Path

import pytest

from app.agents.classifier import classify_document
from app.schemas.documents import DocumentType

DATA_DIR = Path(__file__).parent.parent / "data"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "file_path,expected_type",
    [
        (DATA_DIR / "payslips" / "priya_payslip.pdf", DocumentType.PAYSLIP),
        (DATA_DIR / "payslips" / "arjun_payslip.pdf", DocumentType.PAYSLIP),
        (DATA_DIR / "bank_statements" / "priya_bank.pdf", DocumentType.BANK_STATEMENT),
        (DATA_DIR / "bank_statements" / "rahul_bank.pdf", DocumentType.BANK_STATEMENT),
        (DATA_DIR / "tax_returns" / "priya_tax.pdf", DocumentType.TAX_RETURN),
        (DATA_DIR / "kyc" / "rahul_kyc.pdf", DocumentType.KYC),
        (DATA_DIR / "kyc" / "arjun_kyc.pdf", DocumentType.KYC),
    ],
)
async def test_classifies_correct_type(file_path: Path, expected_type: DocumentType):
    result = await classify_document(file_path)
    assert result.document_type == expected_type
    assert 0.0 <= result.confidence <= 1.0


@pytest.mark.asyncio
async def test_confidence_is_reasonably_high_on_clean_document():
    result = await classify_document(DATA_DIR / "payslips" / "priya_payslip.pdf")
    assert result.confidence >= 0.7
