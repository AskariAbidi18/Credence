from __future__ import annotations

import random
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent

DOCUMENTS_PER_CLASS = 500

RANDOM_SEED = 42

random.seed(RANDOM_SEED)


# ---------------------------------------------------------------------------
# Shared synthetic values
# ---------------------------------------------------------------------------

NAMES = [
    "Aarav Sharma",
    "Priya Nair",
    "Rahul Mehta",
    "Arjun Verma",
    "Neha Kapoor",
    "Rohan Singh",
    "Ananya Rao",
    "Vikram Patel",
    "Sneha Iyer",
    "Karan Malhotra",
    "Ishita Shah",
    "Aditya Menon",
    "Meera Joshi",
    "Kabir Gupta",
    "Riya Bhat",
    "Nikhil Reddy",
    "Simran Kaur",
    "Dev Agarwal",
    "Pooja Desai",
    "Varun Kumar",
]

COMPANIES = [
    "Nimbus Analytics Pvt Ltd",
    "Kestrel Manufacturing Ltd",
    "Solace Health Systems",
    "Vertex Technologies",
    "Bluewave Solutions",
    "Orion Software Pvt Ltd",
    "Apex Consulting",
    "Northstar Industries",
    "Quantum Systems India",
    "Meridian Financial Services",
]

MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

CURRENCIES = [
    "INR",
    "INR",
    "INR",
    "INR",
    "USD",
]

CITIES = [
    "Bengaluru, Karnataka",
    "Mumbai, Maharashtra",
    "Delhi, Delhi",
    "Pune, Maharashtra",
    "Hyderabad, Telangana",
    "Chennai, Tamil Nadu",
]


# ---------------------------------------------------------------------------
# Random helpers
# ---------------------------------------------------------------------------

def random_name() -> str:
    return random.choice(NAMES)


def random_company() -> str:
    return random.choice(COMPANIES)


def random_year() -> int:
    return random.choice([2025, 2026, 2027])


def random_month() -> str:
    return random.choice(MONTHS)


def random_salary() -> int:
    return random.randint(35_000, 250_000)


def random_money(
    minimum: int = 10_000,
    maximum: int = 5_000_000,
) -> int:
    return random.randint(minimum, maximum)


def random_account_last4() -> str:
    return f"{random.randint(0, 9999):04d}"


def random_document_last4() -> str:
    return f"{random.randint(0, 9999):04d}"


# ---------------------------------------------------------------------------
# PDF writer
# ---------------------------------------------------------------------------

def write_pdf(
    path: Path,
    lines: list[str],
) -> None:
    """
    Write a simple text-based PDF.

    These PDFs intentionally remain text-based because production Credence
    will extract their text using pypdf before classification.
    """

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    document = canvas.Canvas(
        str(path),
        pagesize=A4,
    )

    document.setFont(
        "Helvetica",
        12,
    )

    y = 800

    for line in lines:
        document.drawString(
            50,
            y,
            line,
        )

        y -= 22

        if y < 50:
            document.showPage()

            document.setFont(
                "Helvetica",
                12,
            )

            y = 800

    document.save()


# ---------------------------------------------------------------------------
# Training PDF writer
# ---------------------------------------------------------------------------

def write_training_pdf(
    document_type: str,
    index: int,
    lines: list[str],
) -> None:
    """
    Save a generated training PDF into the existing document-type directory.

    IMPORTANT:
    The original hand-authored PDFs already present in these directories
    are not touched. Generated files use the train_XXXX.pdf naming scheme.
    """

    folder_map = {
        "payslip": "payslips",
        "bank_statement": "bank_statements",
        "tax_return": "tax_returns",
        "kyc": "kyc",
    }

    folder_name = folder_map[document_type]

    output_dir = DATA_DIR / folder_name

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path = output_dir / f"train_{index:04d}.pdf"

    write_pdf(
        output_path,
        lines,
    )


# ===========================================================================
# Training document generators
# ===========================================================================


def generate_payslip(index: int) -> None:
    name = random_name()
    company = random_company()

    gross = random_salary()

    deductions = int(
        gross * random.uniform(
            0.08,
            0.25,
        )
    )

    net = gross - deductions

    month = random_month()
    year = random_year()

    currency = random.choice(CURRENCIES)

    style = random.randint(
        0,
        4,
    )

    if style == 0:
        lines = [
            "PAYSLIP",
            f"Employee Name: {name}",
            f"Employer: {company}",
            f"Pay Period: {month} {year}",
            f"Gross Pay: {gross}",
            f"Deductions: {deductions}",
            f"Net Pay: {net}",
            f"Currency: {currency}",
        ]

    elif style == 1:
        lines = [
            "SALARY SLIP",
            f"Name: {name}",
            f"Company: {company}",
            f"For the month of: {month} {year}",
            f"Gross Salary: Rs. {gross:,}",
            f"Total Deductions: Rs. {deductions:,}",
            f"Net Salary: Rs. {net:,}",
            f"Currency: {currency}",
        ]

    elif style == 2:
        lines = [
            "EMPLOYEE SALARY STATEMENT",
            f"Employee: {name}",
            f"Organization: {company}",
            f"Salary Month: {month} {year}",
            f"Total Earnings: {gross}",
            f"Total Deductions: {deductions}",
            f"Take Home Pay: {net}",
            f"Currency: {currency}",
        ]

    elif style == 3:
        lines = [
            "MONTHLY PAY STATEMENT",
            f"Staff Name: {name}",
            f"Employer Name: {company}",
            f"Period: {month}-{year}",
            f"Gross Income: {gross}",
            f"Tax And Other Deductions: {deductions}",
            f"Net Income: {net}",
            f"Currency: {currency}",
        ]

    else:
        lines = [
            "COMPENSATION STATEMENT",
            f"Worker: {name}",
            f"Organization: {company}",
            f"Salary Period: {month}, {year}",
            f"Earnings Before Deductions: {gross:,}",
            f"Deductions From Salary: {deductions:,}",
            f"Amount Paid: {net:,}",
            f"Payment Currency: {currency}",
        ]

    write_training_pdf(
        "payslip",
        index,
        lines,
    )


def generate_bank_statement(index: int) -> None:
    name = random_name()

    opening = random_money(
        20_000,
        2_000_000,
    )

    deposits = random_money(
        20_000,
        500_000,
    )

    withdrawals = random_money(
        10_000,
        300_000,
    )

    closing = max(
        0,
        opening + deposits - withdrawals,
    )

    average = (opening + closing) // 2

    transactions = random.randint(
        8,
        80,
    )

    account_last4 = random_account_last4()

    style = random.randint(
        0,
        4,
    )

    month = random_month()
    year = random_year()

    if style == 0:
        lines = [
            "BANK STATEMENT",
            f"Account Holder: {name}",
            f"Account Number: XXXXXXXX{account_last4}",
            f"Statement Period: {month} {year}",
            f"Opening Balance: {opening}",
            f"Closing Balance: {closing}",
            f"Average Balance: {average}",
            f"Total Deposits: {deposits}",
            f"Total Withdrawals: {withdrawals}",
            f"Transactions: {transactions}",
            "Currency: INR",
        ]

    elif style == 1:
        lines = [
            "SAVINGS ACCOUNT STATEMENT",
            f"Name: {name}",
            f"A/C No.: **** **** {account_last4}",
            f"Period: {month} {year}",
            f"Opening Bal.: Rs. {opening:,}",
            f"Closing Bal.: Rs. {closing:,}",
            f"Avg. Bal.: Rs. {average:,}",
            f"Credits: Rs. {deposits:,}",
            f"Debits: Rs. {withdrawals:,}",
            f"No. of Transactions: {transactions}",
            "Currency: INR",
        ]

    elif style == 2:
        lines = [
            "ACCOUNT TRANSACTION SUMMARY",
            f"Customer: {name}",
            f"Account: XXXXXXXX{account_last4}",
            f"Period Covered: {month} {year}",
            f"Beginning Balance: {opening}",
            f"Ending Balance: {closing}",
            f"Average Account Balance: {average}",
            f"Deposits: {deposits}",
            f"Withdrawals: {withdrawals}",
            f"Transaction Count: {transactions}",
            "Currency: INR",
        ]

    elif style == 3:
        lines = [
            "CURRENT ACCOUNT STATEMENT",
            f"Account Name: {name}",
            f"Account Number: XXXX{account_last4}",
            f"Statement Month: {month} {year}",
            f"Opening Amount: {opening}",
            f"Closing Amount: {closing}",
            f"Average Amount: {average}",
            f"Credit Total: {deposits}",
            f"Debit Total: {withdrawals}",
            f"Number Of Transactions: {transactions}",
            "Currency: INR",
        ]

    else:
        lines = [
            "ACCOUNT STATEMENT",
            f"Customer Name: {name}",
            f"Bank Account: ****{account_last4}",
            f"Reporting Period: {month} {year}",
            f"Balance At Start: {opening:,}",
            f"Balance At End: {closing:,}",
            f"Average Account Balance: {average:,}",
            f"Money Credited: {deposits:,}",
            f"Money Withdrawn: {withdrawals:,}",
            f"Transaction Count: {transactions}",
            "Currency: INR",
        ]

    write_training_pdf(
        "bank_statement",
        index,
        lines,
    )


def generate_tax_return(index: int) -> None:
    name = random_name()

    declared_income = random_money(
        400_000,
        5_000_000,
    )

    taxable_income = int(
        declared_income
        * random.uniform(
            0.65,
            0.95,
        )
    )

    tax_paid = int(
        taxable_income
        * random.uniform(
            0.05,
            0.25,
        )
    )

    year = random_year()

    style = random.randint(
        0,
        4,
    )

    if style == 0:
        lines = [
            "INCOME TAX RETURN SUMMARY",
            f"Taxpayer Name: {name}",
            f"Tax Year: {year}-{str(year + 1)[-2:]}",
            f"Declared Income: {declared_income}",
            f"Taxable Income: {taxable_income}",
            f"Tax Paid: {tax_paid}",
            "Currency: INR",
        ]

    elif style == 1:
        lines = [
            "FORM 16 / TAX RETURN SUMMARY",
            f"Name: {name}",
            f"Assessment Year: {year + 1}-{str(year + 2)[-2:]}",
            f"Gross Total Income: Rs. {declared_income:,}",
            f"Taxable Income: Rs. {taxable_income:,}",
            f"Tax Paid: Rs. {tax_paid:,}",
            "Currency: INR",
        ]

    elif style == 2:
        lines = [
            "ANNUAL TAX STATEMENT",
            f"Taxpayer: {name}",
            f"Financial Year: {year}-{year + 1}",
            f"Total Declared Income: {declared_income}",
            f"Assessable Income: {taxable_income}",
            f"Total Tax Paid: {tax_paid}",
            "Currency: INR",
        ]

    elif style == 3:
        lines = [
            "TAX FILING SUMMARY",
            f"Individual: {name}",
            f"Tax Period: {year}",
            f"Gross Income: {declared_income}",
            f"Taxable Amount: {taxable_income}",
            f"Tax Remitted: {tax_paid}",
            "Currency: INR",
        ]

    else:
        lines = [
            "PERSONAL TAX RETURN",
            f"Taxpayer: {name}",
            f"Return Year: {year}",
            f"Total Income Declared: Rs. {declared_income:,}",
            f"Income Subject To Tax: Rs. {taxable_income:,}",
            f"Income Tax Paid: Rs. {tax_paid:,}",
            "Currency: INR",
        ]

    write_training_pdf(
        "tax_return",
        index,
        lines,
    )


def generate_kyc(index: int) -> None:
    name = random_name()

    dob_year = random.randint(
        1965,
        2002,
    )

    dob_month = random.randint(
        1,
        12,
    )

    dob_day = random.randint(
        1,
        28,
    )

    document_last4 = random_document_last4()

    expiry_year = random.randint(
        2028,
        2035,
    )

    document_types = [
        "Passport",
        "Aadhaar",
        "Driving Licence",
        "Government ID",
        "Identity Card",
        "National ID",
    ]

    document_type = random.choice(
        document_types
    )

    address = (
        f"{random.randint(1, 99)} "
        f"Main Road, "
        f"{random.choice(CITIES)}"
    )

    style = random.randint(
        0,
        4,
    )

    if style == 0:
        lines = [
            "GOVERNMENT ID CARD",
            f"Full Name: {name}",
            (
                "Date of Birth: "
                f"{dob_year}-{dob_month:02d}-{dob_day:02d}"
            ),
            f"Document Type: {document_type}",
            f"Document Number: XXXXXXXX{document_last4}",
            f"Address: {address}",
            f"Expiry Date: {expiry_year}-03-01",
        ]

    elif style == 1:
        lines = [
            document_type.upper(),
            f"Name: {name}",
            (
                f"DOB: "
                f"{dob_day:02d}-"
                f"{dob_month:02d}-"
                f"{dob_year}"
            ),
            f"ID Number: XXXX {document_last4}",
            f"Address: {address}",
            f"Valid Till: {expiry_year}-12-31",
        ]

    elif style == 2:
        lines = [
            "IDENTITY VERIFICATION DOCUMENT",
            f"Applicant Name: {name}",
            (
                "Birth Date: "
                f"{dob_day:02d}/"
                f"{dob_month:02d}/"
                f"{dob_year}"
            ),
            f"Identification Type: {document_type}",
            f"Identification Number: XXXX{document_last4}",
            f"Residential Address: {address}",
            f"Expiration Date: {expiry_year}-06-30",
        ]

    elif style == 3:
        lines = [
            "PERSONAL IDENTITY RECORD",
            f"Name of Holder: {name}",
            (
                "Birthdate: "
                f"{dob_year}/"
                f"{dob_month:02d}/"
                f"{dob_day:02d}"
            ),
            f"ID Type: {document_type}",
            f"ID Last Four: {document_last4}",
            f"Current Address: {address}",
            f"Document Expiry: {expiry_year}",
        ]

    else:
        lines = [
            "IDENTITY DOCUMENT",
            f"Holder Name: {name}",
            (
                "Date Of Birth: "
                f"{dob_day:02d}/"
                f"{dob_month:02d}/"
                f"{dob_year}"
            ),
            f"Identity Document: {document_type}",
            f"Document ID: ****{document_last4}",
            f"Residential Address: {address}",
            f"Expiry: {expiry_year}",
        ]

    write_training_pdf(
        "kyc",
        index,
        lines,
    )


# ===========================================================================
# Training corpus generation
# ===========================================================================

def generate_training_corpus() -> None:
    """
    Generate 500 PDFs for each document class.

    The PDFs are written directly into the existing:
        data/payslips/
        data/bank_statements/
        data/tax_returns/
        data/kyc/

    Existing evaluation PDFs are preserved because generated files use the
    train_XXXX.pdf naming convention.
    """

    print("Generating document classifier training PDFs...")

    generators = {
        "payslip": generate_payslip,
        "bank_statement": generate_bank_statement,
        "tax_return": generate_tax_return,
        "kyc": generate_kyc,
    }

    for document_type, generator in generators.items():

        for index in range(
            1,
            DOCUMENTS_PER_CLASS + 1,
        ):
            generator(index)

        print(
            f"  {document_type}: "
            f"{DOCUMENTS_PER_CLASS} PDFs"
        )

    total = (
        DOCUMENTS_PER_CLASS
        * len(generators)
    )

    print(
        f"\nGenerated {total} training PDFs."
    )


# ===========================================================================
# Original evaluation documents
#
# These are deliberately NOT part of the generated training corpus.
# The classifier will later be evaluated against these unseen PDFs.
# ===========================================================================

def generate_evaluation_documents() -> None:

    # -----------------------------------------------------------------------
    # Priya Nair — clean, fully consistent
    # -----------------------------------------------------------------------

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

    # -----------------------------------------------------------------------
    # Rahul Sharma — deliberately messy / inconsistent
    # -----------------------------------------------------------------------

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

    # No Rahul tax return intentionally.

    # -----------------------------------------------------------------------
    # Arjun Mehta — alternative formatting
    # -----------------------------------------------------------------------

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

    # -----------------------------------------------------------------------
    # Standalone tax return
    # -----------------------------------------------------------------------

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


# ===========================================================================
# Entry point
# ===========================================================================

def main() -> None:

    generate_training_corpus()

    generate_evaluation_documents()

    print(
        "\nSynthetic documents are ready."
    )

    print(
        "Training PDFs: "
        "data/{payslips,bank_statements,tax_returns,kyc}/train_*.pdf"
    )

    print(
        "Evaluation PDFs: "
        "the existing hand-authored PDFs in those same folders."
    )


if __name__ == "__main__":
    main()
    