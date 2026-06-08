import fitz  # PyMuPDF
from pathlib import Path


def extract_pdf(path: str) -> dict:
    """Extract text from a PDF file page by page using PyMuPDF."""
    path = Path(path)
    doc = fitz.open(str(path))

    pages_text = []
    for page in doc:
        pages_text.append(page.get_text())

    full_text = "\n".join(pages_text)
    page_count = len(doc)
    doc.close()

    return {
        "text": full_text,
        "filename": path.name,
        "page_count": page_count,
    }
