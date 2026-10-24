"""Evaluate the DeveloperOS RAG pipeline on a fixed synthetic profile.

Runs the exact production path (indexer.prepare_documents -> rag_engine.ingest_documents ->
retrieve -> select_context -> answer) against eval/fixtures/profile.json and scores it
against eval/dataset.json. Uses a throwaway Chroma directory, never the service's index.

    cd chat-service
    .venv/bin/python eval/run_eval.py --label baseline            # retrieval + answers (calls Groq)
    .venv/bin/python eval/run_eval.py --label dev --retrieval-only  # retrieval metrics only, no LLM calls

Results are written to eval/results/<label>.json.
"""
import argparse
import asyncio
import json
import os
import re
import statistics
import sys
import tempfile
import time
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parent
SERVICE_DIR = EVAL_DIR.parent
sys.path.insert(0, str(SERVICE_DIR))

# Must be set before rag_engine is imported: it reads CHROMA_DIR at import time
os.environ["CHROMA_DIR"] = tempfile.mkdtemp(prefix="devos-rag-eval-")

from dotenv import load_dotenv  # noqa: E402

load_dotenv(SERVICE_DIR / ".env")

import rag_engine  # noqa: E402
from indexer import prepare_documents  # noqa: E402

EVAL_USER = "eval"

REFUSAL = re.compile(
    r"(don.t|do not|doesn.t|does not|isn.t|is not|aren.t|haven.t|have not)\b[^.]{0,60}\b(information|data|record|details|mention|listed|available|included|show|connected|have)"
    r"|not (available|listed|included|connected|mentioned|in your profile)"
    r"|(can.t|cannot|couldn.t|could not) (find|see|tell)"
    r"|\bno (information|data|record|mention|details|repositor|rust|codeforces|kaggle)"
    r"|\bnone of\b",
    re.IGNORECASE,
)


def normalize(text: str) -> str:
    # Models emit non-breaking/figure hyphens ("devos‑api") and nbsp; compare on plain ASCII forms
    text = re.sub(r"[‐-―−]", "-", text)
    return text.replace(" ", " ").lower()


def contains(text: str, term: str) -> bool:
    return re.search(rf"(?<![a-z0-9]){re.escape(normalize(term))}(?![a-z0-9])", text) is not None


def doc_matches(doc, selector: dict) -> bool:
    return all(str(doc.metadata.get(k, "")).lower() == str(v).lower() for k, v in selector.items())


def group_satisfied(docs, group) -> bool:
    return any(doc_matches(d, sel) for d in docs for sel in group)


def score_retrieval(q: dict, retrieved, context) -> dict:
    groups = q.get("expected_docs") or []
    if not groups:
        return {"context_chars": sum(len(d.page_content[:rag_engine.MAX_DOC_CHARS]) for d in context), "context_docs": len(context)}
    found = [group_satisfied(retrieved, g) for g in groups]
    kept = [group_satisfied(context, g) for g in groups]
    first_rank = next((i + 1 for i, d in enumerate(context) if any(doc_matches(d, s) for g in groups for s in g)), None)
    relevant = sum(1 for d in context if any(doc_matches(d, s) for g in groups for s in g))
    return {
        "retrieved_recall": sum(found) / len(groups),
        "context_recall": sum(kept) / len(groups),
        "context_hit": all(kept),
        "lost_to_budget": sum(f and not k for f, k in zip(found, kept)),
        "mrr": 1 / first_rank if first_rank else 0.0,
        "context_precision": relevant / len(context) if context else 0.0,
        "context_chars": sum(len(d.page_content[:rag_engine.MAX_DOC_CHARS]) for d in context),
        "context_docs": len(context),
    }


def score_answer(q: dict, answer: str) -> dict:
    text = normalize(answer)
    violations = [t for t in q.get("must_not", []) if contains(text, t)]
    if q.get("answerable", True) is False:
        abstained = bool(REFUSAL.search(text))
        return {"correct": abstained and not violations, "abstained": abstained, "violations": violations}
    groups = q.get("must", [])
    hits = [any(contains(text, alt) for alt in g) for g in groups]
    missing = [g[0] for g, h in zip(groups, hits) if not h]
    fact_recall = sum(hits) / len(groups) if groups else 1.0
    return {"correct": all(hits) and not violations, "fact_recall": fact_recall, "missing": missing, "violations": violations,
            "abstained": bool(REFUSAL.search(text))}


async def generate(question: str, history, docs, attempts: int = 8):
    """Call the production answer() with backoff: the free Groq tier allows ~8k tokens/minute.

    Returns (answer, call_ms, waited_ms): call_ms times only the successful request, so rate-limit
    backoff doesn't distort latency numbers; waited_ms records the backoff separately."""
    delay, waited = 15, 0.0
    for attempt in range(attempts):
        t0 = time.perf_counter()
        try:
            answer = await rag_engine.answer(question, history, docs)
            return answer, (time.perf_counter() - t0) * 1000, waited
        except Exception as e:
            msg = str(e)
            if ("rate_limit" not in msg and "429" not in msg) or attempt == attempts - 1:
                raise
            match = re.search(r"try again in ([\d.]+)s", msg)
            pause = float(match.group(1)) + 1 if match else delay
            await asyncio.sleep(pause)
            waited += pause * 1000
            delay = min(delay * 2, 60)
    raise RuntimeError("unreachable")


def pct(values, q):
    values = sorted(values)
    return values[min(len(values) - 1, int(round(q * (len(values) - 1))))] if values else 0.0


def summarize(rows: list, with_answers: bool) -> dict:
    def block(items):
        answerable = [r for r in items if r["answerable"]]
        out = {"questions": len(items)}
        if answerable:
            out.update({
                "context_hit_rate": statistics.mean(r["retrieval"]["context_hit"] for r in answerable),
                "retrieved_recall": statistics.mean(r["retrieval"]["retrieved_recall"] for r in answerable),
                "context_recall": statistics.mean(r["retrieval"]["context_recall"] for r in answerable),
                "mrr": statistics.mean(r["retrieval"]["mrr"] for r in answerable),
                "context_precision": statistics.mean(r["retrieval"]["context_precision"] for r in answerable),
            })
        out["avg_context_chars"] = statistics.mean(r["retrieval"]["context_chars"] for r in items)
        out["retrieval_ms_p50"] = pct([r["retrieval_ms"] for r in items], 0.5)
        if with_answers:
            out["answer_accuracy"] = statistics.mean(r["answer_score"]["correct"] for r in items)
            if answerable:
                out["fact_recall"] = statistics.mean(r["answer_score"]["fact_recall"] for r in answerable)
                out["false_refusal_rate"] = statistics.mean(r["answer_score"]["abstained"] and not r["answer_score"]["correct"] for r in answerable)
            unanswerable = [r for r in items if not r["answerable"]]
            if unanswerable:
                out["abstention_accuracy"] = statistics.mean(r["answer_score"]["abstained"] for r in unanswerable)
            out["hallucination_rate"] = statistics.mean(
                bool(r["answer_score"]["violations"]) or (not r["answerable"] and not r["answer_score"]["abstained"]) for r in items)
            out["generation_ms_p50"] = pct([r["generation_ms"] for r in items], 0.5)
            out["generation_ms_p95"] = pct([r["generation_ms"] for r in items], 0.95)
            out["rate_limited_questions"] = sum(1 for r in items if r.get("rate_limit_wait_ms"))
        return out

    categories = sorted({r["category"] for r in rows})
    return {"overall": block(rows), "by_category": {c: block([r for r in rows if r["category"] == c]) for c in categories}}


async def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--label", required=True, help="name for eval/results/<label>.json")
    parser.add_argument("--retrieval-only", action="store_true", help="skip LLM calls")
    parser.add_argument("--ids", help="comma-separated question ids to run")
    parser.add_argument("--pace", type=float, default=0, help="seconds to wait between LLM calls (keeps under rate limits)")
    args = parser.parse_args()

    profile = json.loads((EVAL_DIR / "fixtures" / "profile.json").read_text())
    questions = json.loads((EVAL_DIR / "dataset.json").read_text())["questions"]
    if args.ids:
        wanted = set(args.ids.split(","))
        questions = [q for q in questions if q["id"] in wanted]

    docs = prepare_documents(profile)
    t0 = time.perf_counter()
    rag_engine.ingest_documents(EVAL_USER, docs)
    index_ms = (time.perf_counter() - t0) * 1000
    print(f"indexed {len(docs)} documents in {index_ms:.0f} ms; model={rag_engine.GROQ_MODEL}; {len(questions)} questions\n")

    rows = []
    for q in questions:
        history = rag_engine.normalize_history(q.get("history"))
        t0 = time.perf_counter()
        retrieved = rag_engine.retrieve(EVAL_USER, q["question"], history)
        retrieval_ms = (time.perf_counter() - t0) * 1000
        context = rag_engine.select_context(retrieved)
        row = {
            "id": q["id"], "category": q["category"], "question": q["question"], "answerable": q.get("answerable", True),
            "retrieval": score_retrieval(q, retrieved, context), "retrieval_ms": round(retrieval_ms, 1),
            "context_docs": [f"{d.metadata.get('source')}/{d.metadata.get('type')}/{d.metadata.get('name')}" for d in context],
        }
        if not args.retrieval_only:
            if args.pace and rows:
                await asyncio.sleep(args.pace)
            answer, call_ms, waited_ms = await generate(q["question"], history, retrieved)
            row["generation_ms"] = round(call_ms, 1)
            row["rate_limit_wait_ms"] = round(waited_ms, 1)
            row["answer"] = answer
            row["answer_score"] = score_answer(q, answer)
        rows.append(row)

        r = row["retrieval"]
        status = "" if args.retrieval_only else ("PASS" if row["answer_score"]["correct"] else "FAIL")
        hit = "-" if "context_hit" not in r else ("hit " if r["context_hit"] else "MISS")
        extra = "" if args.retrieval_only else f"  missing={row['answer_score'].get('missing') or ''} viol={row['answer_score']['violations'] or ''}"
        print(f"{q['id']:4} {status:4} ctx:{hit} docs={r['context_docs']:2} chars={r['context_chars']:5}{extra}")

    summary = summarize(rows, with_answers=not args.retrieval_only)
    out = {"label": args.label, "model": rag_engine.GROQ_MODEL, "embedding_model": rag_engine.EMBEDDING_MODEL,
           "documents_indexed": len(docs), "index_ms": round(index_ms, 1),
           "config": {"top_k": rag_engine.TOP_K, "fetch_k": rag_engine.FETCH_K, "max_context_chars": rag_engine.MAX_CONTEXT_CHARS},
           "summary": summary, "results": rows}
    results_dir = EVAL_DIR / "results"
    results_dir.mkdir(exist_ok=True)
    (results_dir / f"{args.label}.json").write_text(json.dumps(out, indent=2) + "\n")
    print("\n" + json.dumps(summary["overall"], indent=2))


if __name__ == "__main__":
    asyncio.run(main())
