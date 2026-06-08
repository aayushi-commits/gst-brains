"""
Shared Qdrant client singleton.
QDRANT_MODE=local  → embedded in-process DB stored in ./qdrant_local_db (no Docker, persistent)
QDRANT_MODE=remote → connects to a running Qdrant server (requires Docker)
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

_client: QdrantClient | None = None

LOCAL_DB_PATH = str(Path(__file__).parent / "qdrant_local_db")


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        mode = os.getenv("QDRANT_MODE", "local").lower()
        if mode == "local":
            _client = QdrantClient(path=LOCAL_DB_PATH)
        else:
            host = os.getenv("QDRANT_HOST", "localhost")
            port = int(os.getenv("QDRANT_PORT", 6333))
            _client = QdrantClient(host=host, port=port)
    return _client
