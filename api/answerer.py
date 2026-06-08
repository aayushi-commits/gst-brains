import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

MODEL = "claude-sonnet-4-5"

SYSTEM_PROMPT = """You are GSTBrain, an expert assistant on Indian Goods and Services Tax (GST) law.
You answer questions for Chartered Accountants (CAs) and tax professionals in clear, plain English.

Rules you must follow:
1. Give a direct, plain-English answer first — no preamble, no "based on the context".
2. Do NOT embed citation tags inside the answer text. Just answer clearly.
3. If sources from different states disagree, flag it at the end of your answer:
   "NOTE: {state_a} and {state_b} sources differ on this point — verify for your jurisdiction."
4. If you cannot find a definitive answer in the provided context, say so clearly rather than speculating.
5. Keep the answer concise — 3 to 6 sentences maximum.
"""


def answer(query: str, chunks: list[dict]) -> dict:
    """Call Claude with retrieved chunks to generate a grounded answer with citations."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i}]\n"
            f"Circular/Notification No.: {chunk.get('circular_no', 'N/A')}\n"
            f"Date: {chunk.get('date', 'N/A')}\n"
            f"State: {chunk.get('state', 'N/A')}\n"
            f"Ruling Type: {chunk.get('ruling_type', 'N/A')}\n"
            f"Topic: {chunk.get('topic', 'N/A')}\n"
            f"Text:\n{chunk.get('text', '')}"
        )

    context_block = "\n\n---\n\n".join(context_parts)

    user_message = (
        f"Question: {query}\n\n"
        f"Context from GST documents:\n\n{context_block}\n\n"
        f"Answer the question based only on the context above. "
        f"Cite every claim with the source circular_no and date."
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_answer = response.content[0].text

    citations = _extract_citations(chunks)
    conflicts = _detect_conflicts(chunks)

    return {
        "answer": raw_answer,
        "citations": citations,
        "conflicts": conflicts,
    }


def _extract_citations(chunks: list[dict]) -> list[dict]:
    """Return one entry per unique circular, including the most relevant text excerpt."""
    seen = set()
    citations = []
    for chunk in chunks:
        key = (chunk.get("circular_no"), chunk.get("date"))
        if key not in seen and chunk.get("circular_no"):
            seen.add(key)
            citations.append({
                "circular_no": chunk.get("circular_no"),
                "date": chunk.get("date"),
                "state": chunk.get("state"),
                "ruling_type": chunk.get("ruling_type"),
                "source_url": chunk.get("source_url"),
                "excerpt": chunk.get("text", "").strip(),
            })
    return citations


def _detect_conflicts(chunks: list[dict]) -> list[str]:
    """Flag cases where different states have chunks on the same topic."""
    state_map: dict[str, list[str]] = {}
    for chunk in chunks:
        state = chunk.get("state")
        circular = chunk.get("circular_no")
        if state and circular:
            state_map.setdefault(state, []).append(circular)

    states = list(state_map.keys())
    if len(states) > 1:
        return [
            f"Multiple state sources found: {', '.join(states)}. "
            f"Verify applicability for your specific state."
        ]
    return []
