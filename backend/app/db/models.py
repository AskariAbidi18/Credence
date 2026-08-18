from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        nullable=False,
    )

    applicant_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    loan_type: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    loan_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    risk_assessment: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    documents: Mapped[list["Document"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
    )

    validation_flags: Mapped[list["ValidationFlag"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
    )

    summary: Mapped["Summary | None"] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        uselist=False,
    )

    review: Mapped["Review | None"] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id"),
        nullable=False,
        index=True,
    )

    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    document_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    classification_confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    extraction_confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    extracted_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    extraction_status: Mapped[str] = mapped_column(
        String(20),
        default="success",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    application: Mapped["Application"] = relationship(
        back_populates="documents",
    )


class ValidationFlag(Base):
    __tablename__ = "validation_flags"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id"),
        nullable=False,
        index=True,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    documents_involved: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    expected: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    observed: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    application: Mapped["Application"] = relationship(
        back_populates="validation_flags",
    )


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    applicant_profile: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    income_assessment: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    overall_assessment: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    flags: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    missing_documents: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    recommendation: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    reviewer_summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    application: Mapped["Application"] = relationship(
        back_populates="summary",
    )


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    decision: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    application: Mapped["Application"] = relationship(
        back_populates="review",
    )
    