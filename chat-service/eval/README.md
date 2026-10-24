# RAG evaluation harness

Measures the chat service's retrieval and answer quality on a fixed, synthetic developer profile.
The latest report is in [`docs/RAG_EVALUATION.md`](../../docs/RAG_EVALUATION.md).

## Files

| File | Purpose |
|---|---|
| `fixtures/profile.json` | Fictional developer ("Jordan Lee"): 12 GitHub repos, LeetCode, GeeksforGeeks, resume, AI insights, activity. Same shape as `database.get_user_data()`. The `knowledge_graph` field was generated with `fastapi-backend/services/knowledge_graph_engine.build_knowledge_graph`. |
| `dataset.json` | 46 labelled questions in 8 categories, including 5 unanswerable traps and 3 multi-turn follow-ups. |
| `run_eval.py` | Indexes the fixture into a throwaway Chroma dir and runs the production path (`prepare_documents` → `ingest_documents` → `retrieve` → `select_context` → `answer`). |
| `compare.py` | Prints Markdown tables comparing two runs. |
| `results/*.json` | Per-question results (context docs, answer, scores) and summaries. |

## Running

```bash
cd chat-service
.venv/bin/python eval/run_eval.py --label dev --retrieval-only   # seconds, no LLM calls
.venv/bin/python eval/run_eval.py --label dev                    # full run, ~15 min on Groq's free tier
.venv/bin/python eval/run_eval.py --label dev --ids A01,A06      # a subset
.venv/bin/python eval/compare.py baseline dev
```

The full run needs `GROQ_API_KEY` (read from `chat-service/.env`). It retries automatically when Groq's
8k tokens/minute limit is hit, so a run takes ~15 minutes and ~46 requests of the 1,000/day quota.

## Labels and scoring

Each question has:

- `expected_docs`: groups of document selectors (metadata key/values). Every group must be matched by a document
  in the context; alternatives within a group are allowed (e.g. a repo's own document *or* the repository catalog).
- `must`: groups of acceptable strings; every group must appear in the answer (case-insensitive, whole-word).
- `must_not`: strings that indicate a wrong or invented answer.
- `answerable: false`: the correct behaviour is to say the information is not in the profile.

Metrics: answer accuracy, fact recall, abstention accuracy, hallucination rate, false-refusal rate, context hit rate
(all evidence reached the LLM), context recall, MRR, context precision, context size and latency.

When you change `indexer.py` or `rag_engine.py`, run the retrieval-only mode first, then a full run, and compare
against `results/improved.json`. Add a question to `dataset.json` for every bug you fix.
