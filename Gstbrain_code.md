# GSTBrain

RAG pipeline over Indian GST documents (CBIC circulars, notifications, AAR rulings).

## Stack
- Python 3.11
- FastAPI + Uvicorn
- LlamaIndex (chunking + retrieval)
- Qdrant (vector DB, runs in Docker on port 6333)
- BGE-M3 embeddings (sentence-transformers, runs locally)
- Claude API (anthropic SDK) for answer generation
- PyMuPDF (fitz) for PDF text extraction

## Project Structure
gstbrain/
├── ingest/        # scraper, extractor, loader
├── api/           # FastAPI app, retriever, answerer
├── data/pdfs/     # downloaded PDFs go here
├── docker-compose.yml
├── .env
└── requirements.txt

## Metadata Schema (every Qdrant document must have)
circular_no, date (YYYY-MM-DD), ruling_type (circular/notification/AAR),
state (central/Maharashtra/Gujarat/Karnataka/Delhi/Tamil Nadu/UP),
superseded_by (null or circular_no), source_url, topic

## Rules
- Never hardcode API keys, always use .env
- All PDF text extraction uses PyMuPDF (fitz)
- BGE-M3 embeddings only (no OpenAI embeddings)
- Qdrant collection name: "gst_docs"