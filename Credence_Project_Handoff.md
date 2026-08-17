# Credence --- Loan Document Processing & Approval Agent

## Project Handoff & Engineering Specification

**Product:** Credence\
**Product tagline:** Intelligent Loan Document Review & Approval\
**Repository:** `Credence`\
**Backend:** FastAPI\
**Primary AI model:** Claude API (vision + text)\
**Orchestration:** Simple Python state-machine/function chain initially;
LangGraph is optional later\
**Frontend:** Streamlit for speed, or React if the team already has a
stable React setup\
**Database:** SQLite for MVP; PostgreSQL if required/available\
**Storage:** Local files for MVP; S3-compatible storage can be added
later

------------------------------------------------------------------------

# 1. Problem & Goal

Credence is an AI-assisted loan document processing system.

The system accepts a batch of applicant documents such as:

-   Payslip
-   Bank statement
-   Tax return
-   KYC document

It then:

1.  Classifies each document.
2.  Extracts structured information.
3.  Validates information across documents.
4.  Identifies inconsistencies and missing documents.
5.  Generates a concise loan-processing summary.
6.  Presents the results to a human reviewer.
7.  Allows the reviewer to approve, reject, or edit/review the
    application.

The system is **human-in-the-loop**. It is not intended to make an
irreversible lending decision autonomously.

------------------------------------------------------------------------

# 2. Official Build Pipeline

The implementation follows this seven-stage sequence:

1.  Set up project and schemas
2.  Build the classifier agent
3.  Build the extraction agent
4.  Chain classifier and extractor with an orchestrator
5.  Build the validation agent
6.  Build the summary agent
7.  Build the reviewer dashboard and wire everything end-to-end

The team is split as follows:

### Team Member A --- Steps 1--3

Owns: - Project setup - Synthetic documents - Canonical schemas -
Classifier agent - Extraction agent

### Team Member B / Core Backend --- Steps 4--7

Owns: - Orchestration - Validation agent - Summary agent - Reviewer
dashboard - End-to-end integration

The critical interface between both sides is the `ExtractedDocument`
contract defined below.

------------------------------------------------------------------------

# 3. Repository Structure

``` text
Credence/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │   ├── upload.py
│   │   │   ├── applications.py
│   │   │   └── review.py
│   │   │
│   │   ├── agents/
│   │   │   ├── classifier.py
│   │   │   ├── extractors.py
│   │   │   ├── validator.py
│   │   │   └── summarizer.py
│   │   │
│   │   ├── orchestration/
│   │   │   └── pipeline.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── documents.py
│   │   │   ├── validation.py
│   │   │   ├── summary.py
│   │   │   └── application.py
│   │   │
│   │   ├── db/
│   │   │   ├── database.py
│   │   │   └── models.py
│   │   │
│   │   └── services/
│   │       └── claude.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   └── ...
│
├── data/
│   ├── payslips/
│   ├── bank_statements/
│   ├── tax_returns/
│   └── kyc/
│
├── tests/
│   ├── test_classifier.py
│   ├── test_extraction.py
│   ├── test_validation.py
│   └── test_pipeline.py
│
├── README.md
├── .gitignore
└── LICENSE
```

------------------------------------------------------------------------

# 4. Canonical Document Types

There are exactly four initial document categories.

``` python
from enum import Enum

class DocumentType(str, Enum):
    PAYSLIP = "payslip"
    BANK_STATEMENT = "bank_statement"
    TAX_RETURN = "tax_return"
    KYC = "kyc"
```

Do not invent alternative names such as `salary_slip`, `bank`,
`identity`, etc. The classifier and extraction pipeline must use these
exact values.

------------------------------------------------------------------------

# 5. Canonical Extraction Schemas

All extraction output must use the following field names.

## 5.1 Payslip

``` python
class PayslipData(BaseModel):
    employee_name: str | None = None
    employer: str | None = None
    period: str | None = None

    gross_pay: float | None = None
    net_pay: float | None = None

    currency: str | None = None
    deductions: float | None = None
```

## 5.2 Bank Statement

``` python
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
```

Do not store full account numbers in the MVP. Only the last four digits
are required.

## 5.3 Tax Return

``` python
class TaxReturnData(BaseModel):
    taxpayer_name: str | None = None

    tax_year: str | None = None

    declared_income: float | None = None
    taxable_income: float | None = None
    tax_paid: float | None = None

    currency: str | None = None
```

## 5.4 KYC

``` python
class KYCData(BaseModel):
    full_name: str | None = None
    date_of_birth: str | None = None

    document_type: str | None = None
    document_number_last4: str | None = None

    address: str | None = None

    expiry_date: str | None = None
```

------------------------------------------------------------------------

# 6. Shared Classifier Contract

The classifier must return structured information.

``` python
class ClassificationResult(BaseModel):
    document_type: DocumentType
    confidence: float
```

Example:

``` json
{
  "document_type": "payslip",
  "confidence": 0.97
}
```

The confidence value should be between `0.0` and `1.0`.

If confidence is low, the system should flag the document for review
rather than blindly trusting the classification.

------------------------------------------------------------------------

# 7. Shared Extraction Contract

All document types must be wrapped in the same outer structure.

``` python
class ExtractedDocument(BaseModel):
    document_id: str
    filename: str

    document_type: DocumentType

    classification_confidence: float
    extraction_confidence: float | None = None

    data: dict

    extraction_status: str = "success"
```

Example:

``` json
{
  "document_id": "doc_001",
  "filename": "john_payslip.pdf",
  "document_type": "payslip",
  "classification_confidence": 0.97,
  "extraction_confidence": 0.94,
  "data": {
    "employee_name": "John Doe",
    "employer": "ABC Ltd",
    "period": "July 2026",
    "gross_pay": 85000,
    "net_pay": 72000,
    "currency": "INR",
    "deductions": 13000
  },
  "extraction_status": "success"
}
```

**This is the primary contract between Steps 1--3 and Steps 4--7.**

------------------------------------------------------------------------

# 8. Application State

The whole application should eventually be represented by one state
object.

``` python
class ApplicationState(BaseModel):
    application_id: str

    documents: list[ExtractedDocument]

    validation: ValidationResult | None = None

    summary: LoanSummary | None = None

    reviewer_decision: str | None = None
    reviewer_notes: str | None = None
```

Possible reviewer decisions:

-   `pending`
-   `approve`
-   `reject`
-   `edit`
-   `manual_review`

------------------------------------------------------------------------

# 9. Validation Agent

The validation agent should initially perform three concrete checks
rather than trying to build a generic fraud detector.

## Check 1 --- Identity Consistency

Compare:

``` text
KYC full_name
      ↕
Bank statement account_holder
      ↕
Payslip employee_name
```

The system should identify mismatches and explain them.

## Check 2 --- Income Consistency

Compare:

``` text
Payslip income
      ↕
Bank deposits
      ↕
Tax-return declared income
```

The first implementation should use a reasonable configurable tolerance
rather than pretending to perform full credit underwriting.

## Check 3 --- Required Documents

Required initial document set:

``` text
KYC
Payslip
Bank Statement
Tax Return
```

Missing documents must be explicitly listed.

------------------------------------------------------------------------

# 10. Validation Schemas

``` python
class ValidationFlag(BaseModel):
    flag_id: str

    severity: str
    # info / warning / critical

    category: str
    # identity / income / documents / financial

    title: str

    reason: str

    documents_involved: list[str]

    expected: str | None = None
    observed: str | None = None
```

Example:

``` json
{
  "flag_id": "VAL-002",
  "severity": "critical",
  "category": "identity",
  "title": "Applicant name mismatch",
  "reason": "The KYC document shows 'Rahul Sharma', while the bank statement shows 'Rahul S Sharma'.",
  "documents_involved": [
    "kyc_001",
    "bank_001"
  ],
  "expected": "Applicant identity should be consistent across submitted documents.",
  "observed": "Names differ across KYC and bank statement."
}
```

Overall validation result:

``` python
class ValidationResult(BaseModel):
    applicant_id: str

    overall_status: str
    # pass / review / reject

    flags: list[ValidationFlag]

    missing_documents: list[DocumentType]

    checks_performed: list[str]

    validation_confidence: float
```

Example:

``` json
{
  "applicant_id": "APP-001",
  "overall_status": "review",
  "flags": [
    {
      "flag_id": "VAL-001",
      "severity": "warning",
      "category": "income",
      "title": "Income discrepancy",
      "reason": "Declared monthly income is approximately 18% higher than observed salary deposits.",
      "documents_involved": [
        "payslip_001",
        "bank_001"
      ],
      "expected": "Income information should be reasonably consistent across submitted documents.",
      "observed": "Observed bank deposits are lower than declared income."
    }
  ],
  "missing_documents": [],
  "checks_performed": [
    "identity_match",
    "income_consistency",
    "required_document_check"
  ],
  "validation_confidence": 0.91
}
```

------------------------------------------------------------------------

# 11. Summary Agent

The summary agent consumes:

-   Extracted document data
-   Validation flags
-   Missing documents
-   Relevant confidence information

It should produce a short structured summary that a human reviewer can
understand in approximately 10 seconds.

## Summary Schemas

``` python
class ApplicantProfile(BaseModel):
    name: str | None = None
    employer: str | None = None
    monthly_income: float | None = None
    currency: str | None = None
```

``` python
class LoanSummary(BaseModel):
    applicant_profile: ApplicantProfile

    income_assessment: str

    overall_assessment: str

    risk_level: str
    # low / medium / high

    flags: list[str]

    missing_documents: list[str]

    recommendation: str
    # approve / review / reject

    reviewer_summary: str

    generated_at: str
```

Important: the recommendation should be presented as an AI-assisted
recommendation for the human reviewer, not as an irreversible autonomous
lending decision.

------------------------------------------------------------------------

# 12. Orchestrator

Do not over-engineer the first version.

A simple Python function/state machine is sufficient.

``` python
async def process_document(file, application_id):

    classification = await classify_document(file)

    extraction = await extract_document(
        file=file,
        document_type=classification.document_type
    )

    save_document_result(
        application_id=application_id,
        classification=classification,
        extraction=extraction
    )

    return extraction
```

For a complete application:

``` python
async def process_application(files, application_id):

    for file in files:
        await process_document(
            file,
            application_id
        )

    validation = await validate_application(
        application_id
    )

    summary = await generate_summary(
        application_id,
        validation
    )

    return {
        "validation": validation,
        "summary": summary
    }
```

LangGraph can be introduced later if there is enough time and a visible
agent trace would improve the demo.

------------------------------------------------------------------------

# 13. System Architecture

``` mermaid
flowchart TD

    A[Applicant Documents] --> B[FastAPI Upload API]

    B --> C[Document Classifier Agent]

    C -->|Document Type + Confidence| D{Document Type}

    D -->|Payslip| E[Payslip Extraction Agent]
    D -->|Bank Statement| F[Bank Statement Extraction Agent]
    D -->|Tax Return| G[Tax Return Extraction Agent]
    D -->|KYC| H[KYC Extraction Agent]

    E --> I[Structured Extraction Store]
    F --> I
    G --> I
    H --> I

    I --> J[Validation Agent]

    J --> K[Validation Results]

    K --> L[Summary Agent]

    L --> M[Loan Processing Summary]

    M --> N[Reviewer Dashboard]

    N --> O{Human Review}

    O -->|Approve| P[Approved]
    O -->|Reject| Q[Rejected]
    O -->|Edit / Manual Review| R[Manual Review]

    I --> S[(Database)]
    K --> S
    M --> S
    O --> S
```

------------------------------------------------------------------------

# 14. Simplified Agent Flow

``` mermaid
flowchart LR

    U[Uploaded Documents] --> O[Application Orchestrator]

    O --> C[Classifier Agent]

    C --> E[Type-Specific Extractor]

    E --> DB[(Application State)]

    DB --> V[Validation Agent]

    V --> DB

    DB --> S[Summary Agent]

    S --> DB

    DB --> D[Reviewer Dashboard]

    D --> H[Human Decision]

    H --> DB
```

The agents should operate on shared application state rather than
directly passing arbitrary outputs to one another.

------------------------------------------------------------------------

# 15. Database ER Diagram

``` mermaid
erDiagram

    APPLICATION ||--o{ DOCUMENT : contains
    APPLICATION ||--o{ VALIDATION_FLAG : generates
    APPLICATION ||--o| SUMMARY : produces
    APPLICATION ||--o| REVIEW : receives

    APPLICATION {
        string id PK
        string status
        datetime created_at
        datetime updated_at
    }

    DOCUMENT {
        string id PK
        string application_id FK
        string filename
        string document_type
        float classification_confidence
        float extraction_confidence
        json extracted_data
        string extraction_status
        datetime created_at
    }

    VALIDATION_FLAG {
        string id PK
        string application_id FK
        string severity
        string category
        string title
        string reason
        json documents_involved
        string expected
        string observed
    }

    SUMMARY {
        string id PK
        string application_id FK
        json applicant_profile
        string income_assessment
        string overall_assessment
        string risk_level
        json flags
        json missing_documents
        string recommendation
        string reviewer_summary
        datetime created_at
    }

    REVIEW {
        string id PK
        string application_id FK
        string decision
        string notes
        datetime reviewed_at
    }
```

------------------------------------------------------------------------

# 16. Validation Philosophy

Do not ask Claude to perform every business rule.

Use:

### LLM / Agent for:

-   Reading messy documents
-   Understanding document content
-   Extracting fields
-   Explaining inconsistencies
-   Producing human-readable summaries

### Python / deterministic logic for:

-   JSON/schema validation
-   Arithmetic
-   Threshold calculations
-   Required-document checks
-   Routing
-   Database operations
-   Application state
-   Final workflow control

This makes the system easier to debug and gives the team a strong
Responsible AI explanation:

> LLMs interpret unstructured information; deterministic code handles
> critical business rules and workflow controls.

------------------------------------------------------------------------

# 17. Reviewer Dashboard Requirements

The dashboard should eventually show the pipeline as it runs.

Example:

``` text
✅ Documents uploaded

✅ KYC classified — 98%
   └─ Extracted 6/6 fields

✅ Payslip classified — 97%
   └─ Extracted 7/7 fields

✅ Bank statement classified — 94%
   └─ Extracted 9/9 fields

⚠️ Validation completed
   └─ 2 inconsistencies detected

⚠️ Income discrepancy
   └─ Declared income differs from observed deposits

✅ Summary generated

👤 Awaiting human review
```

The reviewer should be able to:

-   View uploaded documents
-   View classification
-   View extracted fields
-   View confidence
-   View validation flags
-   View missing documents
-   Read the summary
-   Edit extracted information where necessary
-   Approve
-   Reject
-   Send to manual review
-   Add reviewer notes

------------------------------------------------------------------------

# 18. Demo Case

The final demo should not use only a perfect applicant.

Prepare at least one deliberately messy application.

Example:

``` text
KYC:
Rahul Sharma

Payslip:
Rahul Sharma
Monthly net pay: ₹72,000

Bank Statement:
Rahul S Sharma
Average deposits: ₹59,000

Tax Return:
Rahul Sharma
Declared annual income: ₹10.5 lakh

Missing:
Tax return OR another intentionally missing document depending on test case
```

The validation agent should visibly flag:

-   Identity mismatch
-   Income inconsistency
-   Missing documents if applicable

Then the summary agent should produce a concise reviewer summary.

This demonstrates that the system does more than simply extract clean
fields.

------------------------------------------------------------------------

# 19. Synthetic Test Data

Create several examples of each document type.

Minimum:

``` text
3 payslips
3 bank statements
3 tax returns
3 KYC documents
```

Include:

### Clean documents

Fields are clear and consistent.

### Messy documents

Examples: - Slightly different names - Missing fields - Blurry/poor
scan - Different formatting - Income mismatch - Missing document -
Different date formats

The purpose is to test robustness and create a strong final demo.

------------------------------------------------------------------------

# 20. API Direction

Suggested endpoints:

``` text
POST /api/applications
POST /api/applications/{application_id}/documents
POST /api/applications/{application_id}/process
GET  /api/applications/{application_id}
GET  /api/applications/{application_id}/validation
GET  /api/applications/{application_id}/summary
PATCH /api/applications/{application_id}/review
```

The exact endpoint naming can change if the team already has
conventions, but the responsibilities should remain the same.

------------------------------------------------------------------------

# 21. Coding Rules

1.  Keep schemas centralized.
2.  Do not duplicate schemas inside agent files.
3.  Do not return arbitrary LLM text where structured JSON is expected.
4.  Validate every LLM JSON response with Pydantic.
5.  Use `null` for fields that are genuinely missing.
6.  Never make the LLM guess an unreadable field.
7.  Store confidence values.
8.  Keep raw document identifiers separate from extracted data.
9.  Avoid storing unnecessary sensitive identifiers.
10. Keep deterministic validation rules in Python.
11. Keep the pipeline modular.
12. Do not over-engineer with multiple frameworks unless they provide a
    clear benefit.

------------------------------------------------------------------------

# 22. Immediate Build Order

## Step 1 --- Lock contracts

Before coding, both developers agree on:

-   `DocumentType`
-   `ClassificationResult`
-   `ExtractedDocument`
-   All four extraction schemas
-   `ApplicationState`
-   `ValidationResult`
-   `LoanSummary`

## Step 2 --- Team Member A

Build:

``` text
classifier.py
extractors.py
```

and test them against synthetic documents.

## Step 3 --- Core Backend

Build:

``` text
database.py
models.py
pipeline.py
```

## Step 4 --- Validation

Build:

``` text
validator.py
```

with exactly three initial checks:

``` text
identity_match
income_consistency
required_document_check
```

## Step 5 --- Summary

Build:

``` text
summarizer.py
```

## Step 6 --- API Integration

Connect:

``` text
Upload → Process → Validation → Summary
```

## Step 7 --- Dashboard

Connect the frontend to the API and show the live pipeline.

------------------------------------------------------------------------

# 23. Definition of Done

The MVP is considered functional when:

``` text
Upload 4 documents
        ↓
Classify all 4
        ↓
Extract structured data
        ↓
Persist results
        ↓
Run validation
        ↓
Generate flags
        ↓
Generate summary
        ↓
Display everything in dashboard
        ↓
Human approves/rejects/requests review
```

Only after this works should the team spend time on extra features.

------------------------------------------------------------------------

# 24. Product Positioning

## Credence

**Intelligent Loan Document Review & Approval**

Core message:

> Credence turns a fragmented loan-document review process into an
> AI-assisted, auditable workflow that classifies documents, extracts
> structured information, validates cross-document consistency,
> summarizes risk-relevant findings, and keeps a human reviewer in
> control.

The product should be presented as an **AI-assisted reviewer**, not a
black-box autonomous lender.

------------------------------------------------------------------------

# 25. Final Architecture Principle

The system is intentionally simple:

``` text
CLASSIFY
   ↓
EXTRACT
   ↓
VALIDATE
   ↓
SUMMARIZE
   ↓
HUMAN REVIEW
```

The sophistication comes from:

-   Multi-agent specialization
-   Structured state
-   Confidence-aware processing
-   Cross-document validation
-   Explainability
-   Human-in-the-loop controls
-   Auditability
-   Deterministic business rules
-   Clean end-to-end integration

Do not add complexity merely to make the architecture diagram bigger.
