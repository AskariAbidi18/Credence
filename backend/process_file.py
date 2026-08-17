"""
Process Document File and Export Extracted Information to CSV.

Usage:
    cd backend
    python process_file.py <path-to-document-file>
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from app.agents.classifier import classify_document
from app.agents.extractors import extract_document
from app.services.csv_storage import save_extraction_to_csv


async def process_file_and_export(file_path: str | Path, output_csv: str | Path = "extracted_documents.csv") -> None:
    path = Path(file_path)
    if not path.exists():
        print(f"Error: File '{file_path}' does not exist.")
        sys.exit(1)

    print(f"Processing document: {path.name}")
    print("  [1/3] Classifying document...")
    classification = await classify_document(path)
    print(f"        -> Type: {classification.document_type.value} (Confidence: {classification.confidence:.2f})")

    print("  [2/3] Extracting information...")
    extracted = await extract_document(
        path,
        classification.document_type,
        classification.confidence,
    )
    print(f"        -> Status: {extracted.extraction_status.upper()}")

    print("  [3/3] Saving extracted information to CSV...")
    csv_file = save_extraction_to_csv(extracted, output_path=output_csv)
    print(f"        -> Saved to CSV: {csv_file.resolve()}")

    print("\nExtracted Data:")
    for k, v in extracted.data.items():
        print(f"   • {k:<25}: {v}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process_file.py <path-to-document-file> [output_csv_path]")
        sys.exit(1)

    output_csv_path = sys.argv[2] if len(sys.argv) >= 3 else "extracted_documents.csv"
    asyncio.run(process_file_and_export(sys.argv[1], output_csv_path))
