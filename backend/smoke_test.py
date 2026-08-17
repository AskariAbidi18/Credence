"""
Manual smoke test -- run this after setting XAI_API_KEY to confirm
the classifier and extractor work end to end against a real document,
without needing pytest or the API server.

Usage:
    cd backend
    python smoke_test.py ../data/payslips/priya_payslip.pdf
"""

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from app.agents.classifier import classify_document
from app.agents.extractors import extract_document


async def main(file_path: str) -> None:
    print(f"Classifying: {file_path}")
    classification = await classify_document(file_path)
    print(f"  -> {classification.document_type.value} (confidence {classification.confidence:.2f})")

    print("Extracting...")
    extracted = await extract_document(
        file_path,
        classification.document_type,
        classification.confidence,
    )
    print(f"  -> status: {extracted.extraction_status}")
    print(f"  -> extraction_confidence: {extracted.extraction_confidence}")
    print("  -> data:")
    for key, value in extracted.data.items():
        print(f"       {key}: {value}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python smoke_test.py <path-to-document>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
