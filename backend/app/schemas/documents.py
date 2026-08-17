"""
Canonical document schemas for Credence.

These are the contracts defined in the project handoff (sections 4, 5, 6, 7).
Do not duplicate these models inside agent files — import from here.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    PAYSLIP = "payslip"
    BANK_STATEMENT = "bank_statement"
    TAX_RETURN = "tax_return"
    KYC = "kyc"


# ---------------------------------------------------------------------------
# Type-specific extraction schemas (handoff section 5)
# ---------------------------------------------------------------------------


class PayslipData(BaseModel):
    employee_name: str | None = None
    employer: str | None = None
    period: str | None = None

    gross_pay: float | None = None
    net_pay: float | None = None

    currency: str | None = None
    deductions: float | None = None


class BankStatementData(BaseModel):
    account_holder: str | None = None
    account_number_last4: str | None = None

    statement_period: str | None = None

    opening_balance: float | None = None
    closing_balance: float | None = None
    average_balance: float | None = None

    total_deposits: float | None = None
    total_withdrawals: float | None = None

    transactions_count: int | None = None

    currency: str | None = None


class TaxReturnData(BaseModel):
    taxpayer_name: str | None = None

    tax_year: str | None = None

    declared_income: float | None = None
    taxable_income: float | None = None
    tax_paid: float | None = None

    currency: str | None = None


class KYCData(BaseModel):
    full_name: str | None = None
    date_of_birth: str | None = None

    document_type: str | None = None
    document_number_last4: str | None = None

    address: str | None = None

    expiry_date: str | None = None


# Maps a DocumentType to its extraction schema. The extraction agent uses
# this to know which model to validate against.
DOCUMENT_TYPE_TO_SCHEMA: dict[DocumentType, type[BaseModel]] = {
    DocumentType.PAYSLIP: PayslipData,
    DocumentType.BANK_STATEMENT: BankStatementData,
    DocumentType.TAX_RETURN: TaxReturnData,
    DocumentType.KYC: KYCData,
}


# ---------------------------------------------------------------------------
# Shared classifier contract (handoff section 6)
# ---------------------------------------------------------------------------


class ClassificationResult(BaseModel):
    document_type: DocumentType
    confidence: float = Field(ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Shared extraction contract (handoff section 7)
# ---------------------------------------------------------------------------


class ExtractedDocument(BaseModel):
    document_id: str
    filename: str

    document_type: DocumentType

    classification_confidence: float = Field(ge=0.0, le=1.0)
    extraction_confidence: float | None = Field(default=None, ge=0.0, le=1.0)

    data: dict

    extraction_status: str = "success"
    # success / partial / failed
