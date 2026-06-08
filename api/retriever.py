from sentence_transformers import SentenceTransformer
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range
from qdrant_client_shared import get_client

COLLECTION_NAME = "gst_docs"

_embed_model = None


def _get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("BAAI/bge-m3")
    return _embed_model


def retrieve(query: str, filters: dict = None, top_k: int = 5) -> list[dict]:
    """Embed query with BGE-M3 and run vector search in Qdrant with optional metadata filters."""
    model = _get_embed_model()
    query_vector = model.encode([query], normalize_embeddings=True)[0].tolist()

    qdrant_filter = _build_filter(filters) if filters else None

    client = get_client()
    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=qdrant_filter,
        limit=top_k,
        with_payload=True,
    )

    return [
        {
            "text": hit.payload.get("text", ""),
            "score": hit.score,
            "circular_no": hit.payload.get("circular_no"),
            "date": hit.payload.get("date"),
            "ruling_type": hit.payload.get("ruling_type"),
            "state": hit.payload.get("state"),
            "superseded_by": hit.payload.get("superseded_by"),
            "source_url": hit.payload.get("source_url"),
            "topic": hit.payload.get("topic"),
            "filename": hit.payload.get("filename"),
        }
        for hit in response.points
    ]


def _build_filter(filters: dict) -> Filter:
    conditions = []

    if filters.get("state"):
        conditions.append(
            FieldCondition(key="state", match=MatchValue(value=filters["state"]))
        )

    if filters.get("ruling_type"):
        conditions.append(
            FieldCondition(key="ruling_type", match=MatchValue(value=filters["ruling_type"]))
        )

    if filters.get("date_from") or filters.get("date_to"):
        range_kwargs = {}
        if filters.get("date_from"):
            range_kwargs["gte"] = filters["date_from"]
        if filters.get("date_to"):
            range_kwargs["lte"] = filters["date_to"]
        conditions.append(FieldCondition(key="date", range=Range(**range_kwargs)))

    if not conditions:
        return None

    return Filter(must=conditions)
