import asyncio

from app.services.llm import analyze_document, extract_json


PDF_PATH = "../data/payslips/rahul_payslip.pdf"


async def main():
    response = await analyze_document(
        PDF_PATH,
        """
Classify this document.

Return ONLY a JSON object:

{
    "document_type": "payslip | bank_statement | tax_return | kyc",
    "confidence": 0.0
}

Do not include any other fields.
""",
    )

    print("RAW RESPONSE:")
    print(response)

    print("\nPARSED JSON:")
    print(extract_json(response))


if __name__ == "__main__":
    asyncio.run(main())
    