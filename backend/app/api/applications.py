"""
Application API routes for Credence.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.agents.classifier import classify_document
from app.agents.extractors import extract_document
from app.db.database import get_db
from app.db.models import (
    Application,
    Document,
    ValidationFlag as ValidationFlagModel,
)
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
)
from app.schemas.documents import (
    DocumentType,
    ExtractedDocument,
)
from app.schemas.validation import (
    ValidationFlag as ValidationFlagSchema,
    ValidationResult,
)
from app.services.csv_storage import save_extraction_to_csv
from app.services.risk import (
    RiskAssessmentError,
    assess_loan_risk,
)
from app.services.validation import validate_application


router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)


UPLOAD_DIR = (
    Path(__file__).parent.parent.parent / "uploads"
)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _document_to_schema(
    document: Document,
) -> ExtractedDocument:
    """Convert a database Document into the API schema."""

    return ExtractedDocument(
        document_id=document.id,
        filename=document.filename,
        document_type=DocumentType(document.document_type),
        classification_confidence=(
            document.classification_confidence
        ),
        extraction_confidence=document.extraction_confidence,
        data=document.extracted_data,
        extraction_status=document.extraction_status,
    )


def _validation_to_schema(
    application: Application,
) -> ValidationResult | None:
    """
    Reconstruct the validation result from persisted
    validation flags.
    """

    if not application.validation_flags:
        return None

    flags = [
        ValidationFlagSchema(
            category=flag.category,
            severity=flag.severity,
            title=flag.title,
            reason=flag.reason,
            documents_involved=flag.documents_involved,
            expected=flag.expected,
            observed=flag.observed,
        )
        for flag in application.validation_flags
    ]

    missing_documents = [
        flag.expected
        for flag in flags
        if (
            flag.category.value == "document_completeness"
            and flag.expected
        )
    ]

    passed = not any(
        flag.severity.value == "critical"
        for flag in flags
    )

    confidence = max(
        0.0,
        1.0
        - sum(
            0.20
            if flag.severity.value == "critical"
            else 0.05
            for flag in flags
        ),
    )

    return ValidationResult(
        application_id=application.id,
        passed=passed,
        flags=flags,
        missing_documents=missing_documents,
        validation_confidence=confidence,
    )


# ---------------------------------------------------------------------------
# Create application
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=201,
)
def create_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """Create a new loan application."""

    loan_data = (
        application.loan_data.model_dump(exclude_none=True)
        if application.loan_data
        else {}
    )

    db_application = Application(
        applicant_name=application.applicant_name,
        loan_type=(
            application.loan_type.value
            if application.loan_type
            else None
        ),
        loan_data=loan_data,
        status="pending",
    )

    db.add(db_application)
    db.commit()
    db.refresh(db_application)

    return ApplicationResponse(
        id=db_application.id,
        status=db_application.status,
        applicant_name=db_application.applicant_name,
        loan_type=db_application.loan_type,
        loan_data=application.loan_data,
        documents=[],
        validation=None,
        summary=None,
        risk_assessment=None,
        created_at=db_application.created_at,
        updated_at=db_application.updated_at,
    )


# ---------------------------------------------------------------------------
# Get application
# ---------------------------------------------------------------------------


@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
)
def get_application(
    application_id: str,
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """Get an application and its associated data."""

    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Application not found.",
        )

    return ApplicationResponse(
        id=application.id,
        status=application.status,
        applicant_name=application.applicant_name,
        loan_type=application.loan_type,
        loan_data=application.loan_data or None,
        documents=[
            _document_to_schema(document)
            for document in application.documents
        ],
        validation=_validation_to_schema(application),
        summary=None,
        risk_assessment=(
            application.risk_assessment
            if application.risk_assessment
            else None
        ),
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


# ---------------------------------------------------------------------------
# Loan risk assessment
# ---------------------------------------------------------------------------


@router.post(
    "/{application_id}/risk",
    response_model=ApplicationResponse,
)
def assess_application_risk(
    application_id: str,
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """Run the trained loan risk model for an application."""

    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Application not found.",
        )

    loan_data = application.loan_data or {}

    try:
        risk_result = assess_loan_risk(loan_data)

    except RiskAssessmentError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    application.risk_assessment = risk_result

    if risk_result["decision"] == "Approved":
        application.status = "approved"
    else:
        application.status = "rejected"

    db.commit()
    db.refresh(application)

    return ApplicationResponse(
        id=application.id,
        status=application.status,
        applicant_name=application.applicant_name,
        loan_type=application.loan_type,
        loan_data=application.loan_data or None,
        documents=[
            _document_to_schema(document)
            for document in application.documents
        ],
        validation=_validation_to_schema(application),
        summary=None,
        risk_assessment=risk_result,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


# ---------------------------------------------------------------------------
# Application document upload
# ---------------------------------------------------------------------------


@router.post(
    "/{application_id}/documents",
    response_model=ExtractedDocument,
)
async def upload_application_document(
    application_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ExtractedDocument:
    """
    Upload, classify, extract, and attach a document
    to an existing loan application.
    """

    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Application not found.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided.",
        )

    safe_filename = Path(file.filename).name
    file_path = UPLOAD_DIR / safe_filename

    try:
        # ---------------------------------------------------------------
        # 1. Save uploaded file
        # ---------------------------------------------------------------

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # ---------------------------------------------------------------
        # 2. Classify document
        # ---------------------------------------------------------------

        classification = await classify_document(
            file_path
        )

        # ---------------------------------------------------------------
        # 3. Extract structured data
        # ---------------------------------------------------------------

        extracted = await extract_document(
            file_path,
            classification.document_type,
            classification.confidence,
        )

        # ---------------------------------------------------------------
        # 4. Persist document against application
        # ---------------------------------------------------------------

        db_document = Document(
            id=extracted.document_id,
            application_id=application.id,
            filename=extracted.filename,
            document_type=extracted.document_type.value,
            classification_confidence=(
                extracted.classification_confidence
            ),
            extraction_confidence=(
                extracted.extraction_confidence
            ),
            extracted_data=extracted.data,
            extraction_status=extracted.extraction_status,
        )

        db.add(db_document)
        db.commit()

        # ---------------------------------------------------------------
        # 5. Preserve existing CSV storage
        # ---------------------------------------------------------------

        save_extraction_to_csv(extracted)

        return extracted

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=422,
            detail=f"Document classification failed: {exc}",
        ) from exc

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to process document "
                f"'{safe_filename}': {exc}"
            ),
        ) from exc


# ---------------------------------------------------------------------------
# Application validation
# ---------------------------------------------------------------------------


@router.post(
    "/{application_id}/validate",
    response_model=ApplicationResponse,
)
def validate_application_endpoint(
    application_id: str,
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """
    Run deterministic validation checks for an application.
    """

    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Application not found.",
        )

    # ---------------------------------------------------------------
    # 1. Run validation rules
    # ---------------------------------------------------------------

    validation_result = validate_application(
        application
    )

    # ---------------------------------------------------------------
    # 2. Remove previous validation flags
    # ---------------------------------------------------------------

    for existing_flag in list(
        application.validation_flags
    ):
        db.delete(existing_flag)

    db.flush()

    # ---------------------------------------------------------------
    # 3. Persist new validation flags
    # ---------------------------------------------------------------

    for flag in validation_result.flags:

        db_flag = ValidationFlagModel(
            application_id=application.id,
            severity=flag.severity.value,
            category=flag.category.value,
            title=flag.title,
            reason=flag.reason,
            documents_involved=flag.documents_involved,
            expected=flag.expected,
            observed=flag.observed,
        )

        db.add(db_flag)

    # ---------------------------------------------------------------
    # 4. Determine application workflow status
    # ---------------------------------------------------------------

    # Validation does NOT approve or reject the loan.
    #
    # If required documents are missing or validation contains
    # critical issues, the application requires manual review.

    if (
        not validation_result.passed
        or validation_result.missing_documents
    ):
        application.status = "review_required"

    db.commit()
    db.refresh(application)

    # ---------------------------------------------------------------
    # 5. Return complete application state
    # ---------------------------------------------------------------

    return ApplicationResponse(
        id=application.id,
        status=application.status,
        applicant_name=application.applicant_name,
        loan_type=application.loan_type,
        loan_data=application.loan_data or None,
        documents=[
            _document_to_schema(document)
            for document in application.documents
        ],
        validation=validation_result,
        summary=None,
        risk_assessment=(
            application.risk_assessment
            if application.risk_assessment
            else None
        ),
        created_at=application.created_at,
        updated_at=application.updated_at,
    )
