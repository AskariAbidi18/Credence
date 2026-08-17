"""
Batch Evaluation Script for Credence Classifier & Extraction Agents.

Runs classification and field extraction across ALL synthetic documents in data/
and prints a formatted summary table of results and extracted fields.

Usage:
    cd backend
    python evaluate_all.py
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from app.agents.classifier import classify_document
from app.agents.extractors import extract_document


async def evaluate_all() -> None:
    data_dir = Path(__file__).parent.parent / "data"
    pdf_files = sorted(list(data_dir.glob("**/*.pdf")))

    print("=" * 80)
    print(f"  CREDENCE BATCH EVALUATION REPORT — {len(pdf_files)} DOCUMENTS")
    print("=" * 80)
    print()

    total_docs = len(pdf_files)
    successful_extractions = 0
    classification_matches = 0

    for idx, file_path in enumerate(pdf_files, 1):
        rel_path = file_path.relative_to(data_dir)
        folder_category = file_path.parent.name.rstrip("s")  # e.g., payslips -> payslip

        # 1. Classification
        classification = await classify_document(file_path)
        predicted_type = classification.document_type.value
        cls_conf = classification.confidence

        is_cls_correct = (
            predicted_type == folder_category
            or (folder_category == "bank_statement" and predicted_type == "bank_statement")
            or (folder_category == "tax_return" and predicted_type == "tax_return")
        )
        if is_cls_correct:
            classification_matches += 1

        cls_status_str = "MATCH" if is_cls_correct else "MISMATCH"

        # 2. Extraction
        extracted = await extract_document(
            file_path,
            classification.document_type,
            classification.confidence,
        )

        from app.services.csv_storage import save_extraction_to_csv
        csv_file = save_extraction_to_csv(extracted)

        if extracted.extraction_status == "success":
            successful_extractions += 1

        print(f"[{idx:02d}/{total_docs:02d}] File: {rel_path}")
        print(f"     Classification: {predicted_type:<15} (Confidence: {cls_conf:.2f}) [{cls_status_str}]")
        print(f"     Extraction Status: {extracted.extraction_status.upper():<10} (Doc ID: {extracted.document_id})")
        print("     Extracted Fields:")

        for k, v in extracted.data.items():
            print(f"       • {k:<25}: {v}")
        print("-" * 80)

    print()
    print("=" * 80)
    print("  SUMMARY METRICS")
    print("=" * 80)
    print(f"  Total Documents Tested     : {total_docs}")
    print(f"  Classification Accuracy    : {classification_matches}/{total_docs} ({classification_matches/total_docs*100:.1f}%)")
    print(f"  Extraction Success Rate    : {successful_extractions}/{total_docs} ({successful_extractions/total_docs*100:.1f}%)")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(evaluate_all())
