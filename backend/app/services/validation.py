"""
Deterministic application validation service for Credence.

This service validates an application using its structured loan data
and extracted documents.

It does NOT make the loan approval decision.
The ML risk model is responsible for that.
"""

from __future__ import annotations

from math import isfinite

from app.db.models import Application, Document
from app.schemas.documents import DocumentType
from app.schemas.validation import (
    ValidationCategory,
    ValidationFlag,
    ValidationResult,
    ValidationSeverity,
)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# V1 demo requirement.
# This can later become loan-type-specific configuration.
REQUIRED_DOCUMENTS = {
    DocumentType.KYC,
    DocumentType.PAYSLIP,
    DocumentType.BANK_STATEMENT,
    DocumentType.TAX_RETURN,
}

# Income differences below this percentage are considered acceptable.
INCOME_TOLERANCE = 0.20

# Minimum confidence before a document-quality warning is raised.
CONFIDENCE_WARNING_THRESHOLD = 0.80

# ---------------------------------------------------------------------------
# Financial risk thresholds
# ---------------------------------------------------------------------------

LOW_CIBIL_THRESHOLD = 650
HIGH_RISK_CIBIL_THRESHOLD = 550

MAX_LOAN_TO_INCOME_RATIO = 5.0
MIN_ASSET_COVERAGE_RATIO = 0.50

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _normalise_name(value: str | None) -> str:
    """Normalise a person's name for basic comparison."""

    if not value:
        return ""

    return " ".join(
        value.lower().strip().split()
    )


def _safe_float(value) -> float | None:
    """Convert a value to float if possible."""

    if value is None:
        return None

    try:
        result = float(value)
    except (TypeError, ValueError):
        return None

    if not isfinite(result):
        return None

    return result


def _relative_difference(
    first: float,
    second: float,
) -> float:
    """Return relative difference between two positive values."""

    denominator = max(
        abs(first),
        abs(second),
        1.0,
    )

    return abs(first - second) / denominator


def _document_map(
    documents: list[Document],
) -> dict[str, Document]:
    """Index documents by document type."""

    result: dict[str, Document] = {}

    for document in documents:
        result[document.document_type] = document

    return result


# ---------------------------------------------------------------------------
# Validation rules
# ---------------------------------------------------------------------------


def _check_document_completeness(
    application: Application,
    documents: list[Document],
    flags: list[ValidationFlag],
    missing_documents: list[str],
) -> None:
    """Check whether required document types are present."""

    present_types = {
        document.document_type
        for document in documents
    }

    for required_type in REQUIRED_DOCUMENTS:
        value = required_type.value

        if value not in present_types:
            missing_documents.append(value)

            flags.append(
                ValidationFlag(
                    category=ValidationCategory.DOCUMENT_COMPLETENESS,
                    severity=ValidationSeverity.WARNING,
                    title=f"Missing {value.replace('_', ' ')}",
                    reason=(
                        f"The application does not contain a "
                        f"{value.replace('_', ' ')} document."
                    ),
                    documents_involved=[],
                    expected=value,
                    observed=None,
                )
            )


def _check_document_quality(
    documents: list[Document],
    flags: list[ValidationFlag],
) -> None:
    """Check classifier/extraction confidence and extraction status."""

    for document in documents:

        if document.extraction_status in {
            "failed",
            "partial",
        }:
            flags.append(
                ValidationFlag(
                    category=ValidationCategory.DOCUMENT_QUALITY,
                    severity=ValidationSeverity.WARNING,
                    title="Incomplete document extraction",
                    reason=(
                        f"{document.filename} was processed with "
                        f"extraction status "
                        f"'{document.extraction_status}'."
                    ),
                    documents_involved=[document.filename],
                    expected="success",
                    observed=document.extraction_status,
                )
            )

        if (
            document.classification_confidence
            < CONFIDENCE_WARNING_THRESHOLD
        ):
            flags.append(
                ValidationFlag(
                    category=ValidationCategory.DOCUMENT_QUALITY,
                    severity=ValidationSeverity.WARNING,
                    title="Low classification confidence",
                    reason=(
                        f"The document classifier has low confidence "
                        f"for {document.filename}."
                    ),
                    documents_involved=[document.filename],
                    expected=(
                        f">= {CONFIDENCE_WARNING_THRESHOLD:.2f}"
                    ),
                    observed=(
                        f"{document.classification_confidence:.2f}"
                    ),
                )
            )

        if (
            document.extraction_confidence is not None
            and document.extraction_confidence
            < CONFIDENCE_WARNING_THRESHOLD
        ):
            flags.append(
                ValidationFlag(
                    category=ValidationCategory.DOCUMENT_QUALITY,
                    severity=ValidationSeverity.WARNING,
                    title="Low extraction confidence",
                    reason=(
                        f"Extracted information from "
                        f"{document.filename} has low confidence."
                    ),
                    documents_involved=[document.filename],
                    expected=(
                        f">= {CONFIDENCE_WARNING_THRESHOLD:.2f}"
                    ),
                    observed=(
                        f"{document.extraction_confidence:.2f}"
                    ),
                )
            )


def _check_identity_consistency(
    documents: list[Document],
    flags: list[ValidationFlag],
) -> None:
    """Compare applicant names across identity-related documents."""

    document_map = _document_map(documents)

    kyc = document_map.get(
        DocumentType.KYC.value
    )

    if kyc is None:
        return

    kyc_name = _normalise_name(
        (kyc.extracted_data or {}).get("full_name")
    )

    if not kyc_name:
        return

    comparisons = [
        (
            DocumentType.PAYSLIP.value,
            "employee_name",
        ),
        (
            DocumentType.BANK_STATEMENT.value,
            "account_holder",
        ),
        (
            DocumentType.TAX_RETURN.value,
            "taxpayer_name",
        ),
    ]

    for document_type, field in comparisons:

        document = document_map.get(document_type)

        if document is None:
            continue

        observed_name = _normalise_name(
            (document.extracted_data or {}).get(field)
        )

        if not observed_name:
            continue

        if observed_name != kyc_name:
            flags.append(
                ValidationFlag(
                    category=ValidationCategory.IDENTITY,
                    severity=ValidationSeverity.CRITICAL,
                    title="Identity mismatch",
                    reason=(
                        f"The name in {document.filename} does not "
                        f"match the name in the KYC document."
                    ),
                    documents_involved=[
                        kyc.filename,
                        document.filename,
                    ],
                    expected=kyc_name,
                    observed=observed_name,
                )
            )


def _check_income_consistency(
    application: Application,
    documents: list[Document],
    flags: list[ValidationFlag],
) -> None:
    """Compare declared annual income with extracted income evidence."""

    application_income = _safe_float(
        (application.loan_data or {}).get(
            "income_annum"
        )
    )

    if application_income is None or application_income <= 0:
        return

    document_map = _document_map(documents)

    # ---------------------------------------------------------------
    # Payslip
    # ---------------------------------------------------------------

    payslip = document_map.get(
        DocumentType.PAYSLIP.value
    )

    if payslip:
        gross_pay = _safe_float(
            (payslip.extracted_data or {}).get(
                "gross_pay"
            )
        )

        if gross_pay is not None and gross_pay > 0:

            annualised_income = gross_pay * 12

            difference = _relative_difference(
                application_income,
                annualised_income,
            )

            if difference > INCOME_TOLERANCE:
                flags.append(
                    ValidationFlag(
                        category=ValidationCategory.INCOME,
                        severity=ValidationSeverity.WARNING,
                        title="Income discrepancy",
                        reason=(
                            "The annual income declared in the "
                            "application differs significantly from "
                            "the annualised gross income inferred "
                            "from the submitted payslip."
                        ),
                        documents_involved=[
                            payslip.filename
                        ],
                        expected=(
                            f"{application_income:.2f}"
                        ),
                        observed=(
                            f"{annualised_income:.2f}"
                        ),
                    )
                )

    # ---------------------------------------------------------------
    # Tax return
    # ---------------------------------------------------------------

    tax_return = document_map.get(
        DocumentType.TAX_RETURN.value
    )

    if tax_return:
        declared_income = _safe_float(
            (tax_return.extracted_data or {}).get(
                "declared_income"
            )
        )

        if (
            declared_income is not None
            and declared_income > 0
        ):
            difference = _relative_difference(
                application_income,
                declared_income,
            )

            if difference > INCOME_TOLERANCE:
                flags.append(
                    ValidationFlag(
                        category=ValidationCategory.INCOME,
                        severity=ValidationSeverity.WARNING,
                        title="Tax income discrepancy",
                        reason=(
                            "The annual income declared in the "
                            "application differs significantly from "
                            "the income reported in the tax return."
                        ),
                        documents_involved=[
                            tax_return.filename
                        ],
                        expected=(
                            f"{application_income:.2f}"
                        ),
                        observed=(
                            f"{declared_income:.2f}"
                        ),
                    )
                )


def _check_basic_consistency(
    application: Application,
    documents: list[Document],
    flags: list[ValidationFlag],
) -> None:
    """Check for obviously invalid extracted financial values."""

    for document in documents:

        data = document.extracted_data or {}

        numeric_fields = [
            "gross_pay",
            "net_pay",
            "deductions",
            "opening_balance",
            "closing_balance",
            "average_balance",
            "total_deposits",
            "total_withdrawals",
            "declared_income",
            "taxable_income",
            "tax_paid",
        ]

        for field in numeric_fields:

            value = _safe_float(
                data.get(field)
            )

            if value is not None and value < 0:
                flags.append(
                    ValidationFlag(
                        category=ValidationCategory.CONSISTENCY,
                        severity=ValidationSeverity.CRITICAL,
                        title="Invalid financial value",
                        reason=(
                            f"{document.filename} contains a "
                            f"negative value for {field}."
                        ),
                        documents_involved=[
                            document.filename
                        ],
                        expected=">= 0",
                        observed=str(value),
                    )
                )

def _check_financial_risk(
    application: Application,
    flags: list[ValidationFlag],
) -> None:
    """
    Add deterministic financial risk flags for unusual or
    potentially risky application profiles.

    These checks do not approve or reject the application.
    They provide explicit signals for human reviewer attention.
    """

    loan_data = application.loan_data or {}

    cibil_score = _safe_float(
        loan_data.get("cibil_score")
    )

    income_annum = _safe_float(
        loan_data.get("income_annum")
    )

    loan_amount = _safe_float(
        loan_data.get("loan_amount")
    )

    asset_fields = [
        "residential_assets_value",
        "commercial_assets_value",
        "luxury_assets_value",
        "bank_asset_value",
    ]

    total_assets = sum(
        _safe_float(loan_data.get(field)) or 0.0
        for field in asset_fields
    )

    # ---------------------------------------------------------------
    # CIBIL risk
    # ---------------------------------------------------------------

    if cibil_score is not None:

        if cibil_score < HIGH_RISK_CIBIL_THRESHOLD:

            flags.append(
                ValidationFlag(
                    category=ValidationCategory.FINANCIAL_RISK,
                    severity=ValidationSeverity.CRITICAL,
                    title="Very low CIBIL score",
                    reason=(
                        f"The applicant's CIBIL score of "
                        f"{int(cibil_score)} indicates a high "
                        f"credit-risk profile and requires manual "
                        f"review."
                    ),
                    expected=(
                        f">= {HIGH_RISK_CIBIL_THRESHOLD}"
                    ),
                    observed=str(int(cibil_score)),
                )
            )

        elif cibil_score < LOW_CIBIL_THRESHOLD:

            flags.append(
                ValidationFlag(
                    category=ValidationCategory.FINANCIAL_RISK,
                    severity=ValidationSeverity.WARNING,
                    title="Low CIBIL score",
                    reason=(
                        f"The applicant's CIBIL score of "
                        f"{int(cibil_score)} is below the preferred "
                        f"risk threshold and should be considered "
                        f"during review."
                    ),
                    expected=(
                        f">= {LOW_CIBIL_THRESHOLD}"
                    ),
                    observed=str(int(cibil_score)),
                )
            )

    # ---------------------------------------------------------------
    # Loan-to-income risk
    # ---------------------------------------------------------------

    if (
        income_annum is not None
        and income_annum > 0
        and loan_amount is not None
        and loan_amount > 0
    ):
        loan_to_income = (
            loan_amount / income_annum
        )

        if loan_to_income > MAX_LOAN_TO_INCOME_RATIO:

            flags.append(
                ValidationFlag(
                    category=ValidationCategory.FINANCIAL_RISK,
                    severity=ValidationSeverity.WARNING,
                    title="High loan-to-income ratio",
                    reason=(
                        f"The requested loan is "
                        f"{loan_to_income:.2f} times the declared "
                        f"annual income, which may indicate limited "
                        f"repayment capacity."
                    ),
                    expected=(
                        f"<= {MAX_LOAN_TO_INCOME_RATIO:.2f}"
                    ),
                    observed=f"{loan_to_income:.2f}",
                )
            )

    # ---------------------------------------------------------------
    # Asset coverage risk
    # ---------------------------------------------------------------

    if loan_amount is not None and loan_amount > 0:

        if total_assets <= 0:

            flags.append(
                ValidationFlag(
                    category=ValidationCategory.FINANCIAL_RISK,
                    severity=ValidationSeverity.WARNING,
                    title="No declared assets",
                    reason=(
                        "The application reports no declared assets. "
                        "This may be valid for an unsecured loan, "
                        "but the absence of asset backing should be "
                        "considered during manual review."
                    ),
                    expected="> 0",
                    observed="0",
                )
            )

        else:

            asset_coverage_ratio = (
                total_assets / loan_amount
            )

            if (
                asset_coverage_ratio
                < MIN_ASSET_COVERAGE_RATIO
            ):

                flags.append(
                    ValidationFlag(
                        category=ValidationCategory.FINANCIAL_RISK,
                        severity=ValidationSeverity.WARNING,
                        title="Low asset coverage",
                        reason=(
                            f"Declared assets cover only "
                            f"{asset_coverage_ratio:.2%} of the "
                            f"requested loan amount."
                        ),
                        expected=(
                            f">= "
                            f"{MIN_ASSET_COVERAGE_RATIO:.0%} "
                            f"of loan amount"
                        ),
                        observed=(
                            f"{asset_coverage_ratio:.2%}"
                        ),
                    )
                )

# ---------------------------------------------------------------------------
# Main validation function
# ---------------------------------------------------------------------------


def validate_application(
    application: Application,
) -> ValidationResult:
    """
    Validate an application using its loan data and documents.

    This function does not make an approval/rejection decision.
    """

    documents = list(
        application.documents or []
    )

    flags: list[ValidationFlag] = []
    missing_documents: list[str] = []

    _check_document_completeness(
        application,
        documents,
        flags,
        missing_documents,
    )

    _check_document_quality(
        documents,
        flags,
    )

    _check_identity_consistency(
        documents,
        flags,
    )

    _check_income_consistency(
        application,
        documents,
        flags,
    )

    _check_financial_risk(
        application,
        flags,
    )

    _check_basic_consistency(
        application,
        documents,
        flags,
    )

    critical_flags = sum(
        flag.severity == ValidationSeverity.CRITICAL
        for flag in flags
    )

    warning_flags = sum(
        flag.severity == ValidationSeverity.WARNING
        for flag in flags
    )

    # Start with high confidence and reduce it according
    # to the number/severity of validation issues.
    confidence = 1.0

    confidence -= critical_flags * 0.20
    confidence -= warning_flags * 0.05

    confidence = max(
        0.0,
        min(1.0, confidence),
    )

    passed = not any(
        flag.severity == ValidationSeverity.CRITICAL
        for flag in flags
    )

    return ValidationResult(
        application_id=application.id,
        passed=passed,
        flags=flags,
        missing_documents=missing_documents,
        validation_confidence=confidence,
    )
