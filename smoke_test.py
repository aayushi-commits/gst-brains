"""
Smoke test: ingest 3 PDFs from data/pdfs/ and ask a GST question.
Place your 3 PDF files in data/pdfs/ before running.
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).parent))

from ingest.extractor import extract_pdf
from ingest.loader import load_to_qdrant
from api.retriever import retrieve
from api.answerer import answer

PDF_DIR = Path(__file__).parent / "data" / "pdfs"
QUERY = "Is manpower supply to a hospital exempt from GST?"

DUMMY_METADATA_TEMPLATE = {
    "date": "2023-01-01",
    "ruling_type": "circular",
    "state": "central",
    "superseded_by": None,
    "source_url": None,
    "topic": "GST exemption - healthcare services",
}

CIRCULAR_NOS = ["TEST-001", "TEST-002", "TEST-003"]


def main():
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"ERROR: No PDFs found in {PDF_DIR}. Place at least one PDF there and retry.")
        sys.exit(1)

    pdfs = pdfs[:3]
    print(f"Found {len(pdfs)} PDF(s): {[p.name for p in pdfs]}\n")

    for i, pdf_path in enumerate(pdfs):
        circular_no = CIRCULAR_NOS[i] if i < len(CIRCULAR_NOS) else f"TEST-{i+1:03d}"
        metadata = {**DUMMY_METADATA_TEMPLATE, "circular_no": circular_no}

        print(f"[{i+1}/{len(pdfs)}] Extracting: {pdf_path.name} ...")
        doc = extract_pdf(str(pdf_path))
        print(f"       Pages: {doc['page_count']}, Text length: {len(doc['text'])} chars")

        print(f"       Loading into Qdrant as {circular_no} ...")
        n_chunks = load_to_qdrant(doc, metadata)
        print(f"       Upserted {n_chunks} chunks.\n")

    print("=" * 60)
    print(f"QUERY: {QUERY}")
    print("=" * 60)

    print("\nRetrieving relevant chunks ...")
    chunks = retrieve(query=QUERY, top_k=5)
    print(f"Retrieved {len(chunks)} chunks.\n")

    print("Generating answer via Claude ...\n")
    result = answer(query=QUERY, chunks=chunks)

    print("\nANSWER:")
    print("=" * 60)
    print(result["answer"])

    if result["conflicts"]:
        print("\n⚠  CONFLICTS DETECTED:")
        for conflict in result["conflicts"]:
            print(f"   {conflict}")

    if result["citations"]:
        print("\n" + "=" * 60)
        print("REFERENCE CIRCULARS:")
        print("=" * 60)
        for i, c in enumerate(result["citations"], 1):
            print(f"\n[{i}] {c['ruling_type'].upper()} No. {c['circular_no']}  |  Date: {c['date']}  |  {c['state']}")
            if c.get("source_url"):
                print(f"    Source: {c['source_url']}")
            print(f"\n    Excerpt:")
            print(f"    {'-' * 56}")
            excerpt = c.get("excerpt", "")
            # Print excerpt wrapped at 80 chars, indented
            for line in excerpt.splitlines():
                line = line.strip()
                if line:
                    print(f"    {line}")
            print()

    print("=" * 60)
    print("Smoke test complete.")


if __name__ == "__main__":
    main()
