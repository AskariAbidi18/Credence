"""
CSV Storage Service for Credence.

Appends extracted document data to a CSV file upon file processing/upload.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from app.schemas.documents import ExtractedDocument

DEFAULT_CSV_PATH = Path(__file__).parent.parent.parent / "extracted_documents.csv"

# Comprehensive field headers for tabular CSV storage
CSV_HEADERS = [
    "document_id",
    "filename",
    "document_type",
    "classification_confidence",
    "extraction_confidence",
    "extraction_status",
    "applicant_name",
    # Payslip fields
    "employer",
    "period",
    "gross_pay",
    "net_pay",
    "deductions",
    # Bank Statement fields
    "account_number_last4",
    "statement_period",
    "opening_balance",
    "closing_balance",
    "average_balance",
    "total_deposits",
    "total_withdrawals",
    "transactions_count",
    # Tax Return fields
    "tax_year",
    "declared_income",
    "taxable_income",
    "tax_paid",
    # KYC fields
    "date_of_birth",
    "kyc_doc_type",
    "document_number_last4",
    "address",
    "expiry_date",
    "currency",
    # Raw JSON backup
    "raw_extracted_json",
]


def save_extraction_to_csv(
    extracted_doc: ExtractedDocument,
    output_path: str | Path = DEFAULT_CSV_PATH,
) -> Path:
    """
    Appends an ExtractedDocument object into a CSV file.
    Creates the CSV with headers if it does not already exist.
    """
    csv_file = Path(output_path)
    csv_file.parent.mkdir(parents=True, exist_ok=True)

    file_exists = csv_file.exists() and csv_file.stat().st_size > 0

    data: dict[str, Any] = extracted_doc.data or {}

    # Extract unified applicant name across doc types
    applicant_name = (
        data.get("employee_name")
        or data.get("account_holder")
        or data.get("taxpayer_name")
        or data.get("full_name")
        or ""
    )

    row = {
        "document_id": extracted_doc.document_id,
        "filename": extracted_doc.filename,
        "document_type": extracted_doc.document_type.value,
        "classification_confidence": extracted_doc.classification_confidence,
        "extraction_confidence": extracted_doc.extraction_confidence or "",
        "extraction_status": extracted_doc.extraction_status,
        "applicant_name": applicant_name,
        # Payslip
        "employer": data.get("employer", ""),
        "period": data.get("period", ""),
        "gross_pay": data.get("gross_pay", ""),
        "net_pay": data.get("net_pay", ""),
        "deductions": data.get("deductions", ""),
        # Bank Statement
        "account_number_last4": data.get("account_number_last4", ""),
        "statement_period": data.get("statement_period", ""),
        "opening_balance": data.get("opening_balance", ""),
        "closing_balance": data.get("closing_balance", ""),
        "average_balance": data.get("average_balance", ""),
        "total_deposits": data.get("total_deposits", ""),
        "total_withdrawals": data.get("total_withdrawals", ""),
        "transactions_count": data.get("transactions_count", ""),
        # Tax Return
        "tax_year": data.get("tax_year", ""),
        "declared_income": data.get("declared_income", ""),
        "taxable_income": data.get("taxable_income", ""),
        "tax_paid": data.get("tax_paid", ""),
        # KYC
        "date_of_birth": data.get("date_of_birth", ""),
        "kyc_doc_type": data.get("document_type", ""),
        "document_number_last4": data.get("document_number_last4", ""),
        "address": data.get("address", ""),
        "expiry_date": data.get("expiry_date", ""),
        "currency": data.get("currency", ""),
        # Raw JSON payload
        "raw_extracted_json": json.dumps(data),
    }

    with open(csv_file, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)

    return csv_file
