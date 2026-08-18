"""
Application API routes for Credence.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Application
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
)

from app.services.risk import (
    RiskAssessmentError,
    assess_loan_risk,
)

router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)


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


@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
)
def get_application(
    application_id: str,
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """Get an application by ID."""

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
        documents=[],
        validation=None,
        summary=None,
        risk_assessment=(
            application.risk_assessment
            if application.risk_assessment
            else None
        ),
        created_at=application.created_at,
        updated_at=application.updated_at,
    )

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
        documents=[],
        validation=None,
        summary=None,
        risk_assessment=risk_result,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )
