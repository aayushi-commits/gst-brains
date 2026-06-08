from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

from api.retriever import retrieve
from api.answerer import answer

app = FastAPI(title="GSTBrain API", version="0.1.0")


class AskRequest(BaseModel):
    question: str
    state: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class AskResponse(BaseModel):
    answer: str
    citations: list
    conflicts: list


@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    filters = {}
    if request.state:
        filters["state"] = request.state
    if request.date_from:
        filters["date_from"] = request.date_from
    if request.date_to:
        filters["date_to"] = request.date_to

    try:
        chunks = retrieve(query=request.question, filters=filters or None, top_k=5)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Retrieval failed: {e}")

    if not chunks:
        return AskResponse(
            answer="No relevant documents found for your query.",
            citations=[],
            conflicts=[],
        )

    try:
        result = answer(query=request.question, chunks=chunks)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Answer generation failed: {e}")

    return AskResponse(**result)


@app.get("/health")
async def health():
    return {"status": "ok"}
