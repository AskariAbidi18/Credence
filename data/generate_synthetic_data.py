"""
Generates synthetic test documents into data/payslips, data/bank_statements,
data/tax_returns, data/kyc — per handoff section 19.

These are plain-text PDFs, not scanned images. They're for testing the
classifier/extractor prompts quickly, not a substitute for testing against
real scanned documents before the demo.

Includes one deliberately messy applicant (Rahul Sharma) matching the demo
case in handoff section 18: a slightly different name on the bank
statement, an income mismatch between payslip and bank deposits, and no
tax return uploaded at all (missing-document case).

Run with: python data/generate_synthetic_data.py
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

DATA_DIR = Path(__file__).parent


def write_pdf(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setFont("Helvetica", 12)
    y = 800
    for line in lines:
        c.drawString(50, y, line)
        y -= 22
    c.save()


def main() -> None:
    # --- Applicant 1: Priya Nair — clean, fully consistent ---
    write_pdf(
        DATA_DIR / "payslips" / "priya_payslip.pdf",
        [
            "PAYSLIP",
            "Employee Name: Priya Nair",
            "Employer: Nimbus Analytics Pvt Ltd",
            "Pay Period: July 2026",
            "Gross Pay: 95000",
            "Deductions: 15000",
            "Net Pay: 80000",
            "Currency: INR",
        ],
    )
    write_pdf(
        DATA_DIR / "bank_statements" / "priya_bank.pdf",
        [
            "BANK STATEMENT",
            "Account Holder: Priya Nair",
            "Account Number: XXXXXXXX4821",
            "Statement Period: July 2026",
            "Opening Balance: 120000",
            "Closing Balance: 158000",
            "Average Balance: 139000",
            "Total Deposits: 82000",
            "Total Withdrawals: 44000",
            "Transactions: 21",
            "Currency: INR",
        ],
    )
    write_pdf(
        DATA_DIR / "tax_returns" / "priya_tax.pdf",
        [
            "INCOME TAX RETURN SUMMARY",
            "Taxpayer Name: Priya Nair",
            "Tax Year: 2025-26",
            "Declared Income: 1140000",
            "Taxable Income: 990000",
            "Tax Paid: 128000",
            "Currency: INR",
        ],
    )
    write_pdf(
        DATA_DIR / "kyc" / "priya_kyc.pdf",
        [
            "GOVERNMENT ID CARD",
            "Full Name: Priya Nair",
            "Date of Birth: 1992-04-11",
            "Document Type: Passport",
            "Document Number: A1234789 (last4: 4789)",
            "Address: 14 MG Road, Bengaluru, Karnataka",
            "Expiry Date: 2031-03-01",
        ],
    )

    # --- Applicant 2: Rahul Sharma — the messy demo case ---
    write_pdf(
        DATA_DIR / "payslips" / "rahul_payslip.pdf",
        [
            "PAYSLIP",
            "Employee Name: Rahul Sharma",
            "Employer: Kestrel Manufacturing Ltd",
            "Pay Period: 07/2026",
            "Gross Pay: 84000",
            "Deductions: 12000",
            "Net Pay: 72000",
            "Currency: INR",
        ],
    )
    # Name spelled slightly differently, and average deposits are well
    # below the payslip net pay -- both intentional, per handoff section 18.
    write_pdf(
        DATA_DIR / "bank_statements" / "rahul_bank.pdf",
        [
            "BANK STATEMENT",
            "Account Holder: Rahul S Sharma",
            "Account Number: XXXXXXXX9042",
            "Statement Period: July 2026",
            "Opening Balance: 41000",
            "Closing Balance: 55000",
            "Average Balance: 47000",
            "Total Deposits: 59000",
            "Total Withdrawals: 45000",
            "Transactions: 33",
            "Currency: INR",
        ],
    )
    write_pdf(
        DATA_DIR / "kyc" / "rahul_kyc.pdf",
        [
            "GOVERNMENT ID CARD",
            "Full Name: Rahul Sharma",
            "Date of Birth: 1989-11-02",
            "Document Type: Aadhaar",
            "Document Number: 4471 8890 2216 (last4: 2216)",
            "Address: 22 Linking Road, Mumbai, Maharashtra",
            "Expiry Date: N/A",
        ],
    )
    # Deliberately no tax_returns file for Rahul -- this is the
    # missing-document case the validation agent should catch.

    # --- Applicant 3: Arjun Mehta — clean but different formatting ---
    write_pdf(
        DATA_DIR / "payslips" / "arjun_payslip.pdf",
        [
            "SALARY SLIP",
            "Name: Arjun Mehta",
            "Company: Solace Health Systems",
            "For the month of: August 2026",
            "Gross Salary: Rs. 1,10,000",
            "Total Deductions: Rs. 18,000",
            "Net Salary: Rs. 92,000",
        ],
    )
    write_pdf(
        DATA_DIR / "bank_statements" / "arjun_bank.pdf",
        [
            "SAVINGS ACCOUNT STATEMENT",
            "Name: Arjun Mehta",
            "A/C No.: **** **** 7734",
            "Period: 01-Aug-2026 to 31-Aug-2026",
            "Opening Bal.: Rs. 2,05,000",
            "Closing Bal.: Rs. 2,71,000",
            "Avg. Bal.: Rs. 2,38,000",
            "Credits: Rs. 94,000",
            "Debits: Rs. 28,000",
            "No. of Transactions: 17",
        ],
    )
    write_pdf(
        DATA_DIR / "tax_returns" / "arjun_tax.pdf",
        [
            "FORM 16 / TAX RETURN SUMMARY",
            "Name: Arjun Mehta",
            "Assessment Year: 2026-27",
            "Gross Total Income: Rs. 13,20,000",
            "Taxable Income: Rs. 11,40,000",
            "Tax Paid: Rs. 1,58,000",
        ],
    )
    write_pdf(
        DATA_DIR / "kyc" / "arjun_kyc.pdf",
        [
            "DRIVING LICENCE",
            "Name: ARJUN MEHTA",
            "DOB: 14-02-1990",
            "Licence No.: MH12 20180056784 (last4: 6784)",
            "Address: Flat 9B, Powai, Mumbai",
            "Valid Till: 13-02-2030",
        ],
    )

    # --- Extra standalone tax return, for classifier/extractor testing ---
    write_pdf(
        DATA_DIR / "tax_returns" / "neha_tax.pdf",
        [
            "INCOME TAX RETURN SUMMARY",
            "Taxpayer Name: Neha Verma",
            "Tax Year: 2025-26",
            "Declared Income: 860000",
            "Taxable Income: 740000",
            "Tax Paid: 61000",
            "Currency: INR",
        ],
    )

    print("Synthetic test documents written to data/")


if __name__ == "__main__":
    main()
