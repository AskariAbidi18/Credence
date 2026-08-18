from pathlib import Path

from pypdf import PdfReader


ROOT = Path("../data")


for path in ROOT.rglob("*.pdf"):
    try:
        reader = PdfReader(str(path))

        text = "\n".join(
            page.extract_text() or ""
            for page in reader.pages
        )

        print(
            f"{path.parent.name}/{path.name}: "
            f"{len(text)} chars, "
            f"{len(reader.pages)} pages"
        )

    except Exception as exc:
        print(
            f"{path.parent.name}/{path.name}: "
            f"FAILED -> {exc}"
        )
        