# Credence

Intelligent Loan Document Review & Approval — an AI-assisted, human-in-the-loop
system that classifies loan applicant documents, extracts structured data,
validates cross-document consistency, and summarizes findings for a human
reviewer.

Full engineering spec: [`Credence_Project_Handoff.md`](./Credence_Project_Handoff.md).

## Current scope of this branch

This branch implements build-order steps 1–3 (project setup, classifier
agent, extraction agent) — the "Team Member A" half of the pipeline per the
handoff doc. Orchestration, validation, summary, and the reviewer dashboard
are not implemented yet.

```
backend/app/schemas/documents.py   canonical contracts (DocumentType, ClassificationResult, ExtractedDocument, ...)
backend/app/services/claude.py     Anthropic API wrapper (vision + JSON parsing)
backend/app/agents/classifier.py   classifier agent
backend/app/agents/extractors.py   extraction agent
data/                               synthetic test documents (clean + one messy applicant)
tests/test_classifier.py           classifier tests
tests/test_extraction.py           extraction tests
```

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and set XAI_API_KEY
```

Synthetic test documents are already generated in `data/`. To regenerate
them:

```bash
python data/generate_synthetic_data.py
```

## Try it

Smoke test one document without pytest:

```bash
cd backend
python smoke_test.py ../data/payslips/priya_payslip.pdf
```

Run the test suite (makes real API calls, no mocking):

```bash
pytest tests/ -v
```

## Notes on the synthetic data

`data/` includes three applicants:

- **Priya Nair** — clean, fully consistent across all four document types.
- **Rahul Sharma** — the deliberately messy demo case from the handoff spec
  (section 18): the bank statement has a slightly different name ("Rahul S
  Sharma"), the bank deposits are notably lower than the payslip's net pay,
  and there is intentionally no tax return uploaded for this applicant.
- **Arjun Mehta** — clean but uses different formatting/currency notation
  to test extraction robustness.

This is enough to exercise both the happy path and the validation-agent
edge cases once that agent is built.
