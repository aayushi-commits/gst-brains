import uuid
from sentence_transformers import SentenceTransformer
from qdrant_client.models import Distance, VectorParams, PointStruct
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core import Document
from qdrant_client_shared import get_client

COLLECTION_NAME = "gst_docs"
VECTOR_SIZE = 1024  # BGE-M3 output dimension
CHUNK_SIZE = 512
CHUNK_OVERLAP = 50

_embed_model = None


def _get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("BAAI/bge-m3")
    return _embed_model


def _ensure_collection(client: QdrantClient) -> None:
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def load_to_qdrant(doc_dict: dict, metadata: dict) -> int:
    """Chunk, embed, and upsert a document into Qdrant. Returns number of chunks upserted."""
    text = doc_dict["text"]
    filename = doc_dict["filename"]

    splitter = SentenceSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    llama_doc = Document(text=text)
    nodes = splitter.get_nodes_from_documents([llama_doc])
    chunks = [node.get_content() for node in nodes]

    model = _get_embed_model()
    embeddings = model.encode(chunks, normalize_embeddings=True).tolist()

    client = get_client()
    _ensure_collection(client)

    points = []
    for chunk_text, vector in zip(chunks, embeddings):
        payload = {**metadata, "text": chunk_text, "filename": filename}
        points.append(
            PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload)
        )

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    return len(points)
