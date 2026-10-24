"""Print Markdown comparison tables for two eval runs.

    .venv/bin/python eval/compare.py baseline improved
"""
import json
import sys
from pathlib import Path

RESULTS = Path(__file__).resolve().parent / "results"

METRICS = [
    ("answer_accuracy", "Answer accuracy", "pct"),
    ("fact_recall", "Fact recall (required facts present)", "pct"),
    ("abstention_accuracy", "Abstention accuracy (unanswerable)", "pct"),
    ("hallucination_rate", "Hallucination rate", "pct"),
    ("false_refusal_rate", "False refusals (answerable)", "pct"),
    ("context_hit_rate", "Context hit rate (all evidence reached LLM)", "pct"),
    ("context_recall", "Context recall", "pct"),
    ("mrr", "MRR (rank of first relevant doc)", "num"),
    ("context_precision", "Context precision", "pct"),
    ("avg_context_chars", "Avg. context size (chars)", "int"),
    ("retrieval_ms_p50", "Retrieval latency p50 (ms)", "num"),
    ("generation_ms_p50", "Generation latency p50 (ms)", "int"),
]


def fmt(value, kind):
    if value is None:
        return "–"
    return {"pct": f"{value * 100:.1f}%", "num": f"{value:.2f}", "int": f"{value:,.0f}"}[kind]


def main(a_label: str, b_label: str):
    a = json.loads((RESULTS / f"{a_label}.json").read_text())
    b = json.loads((RESULTS / f"{b_label}.json").read_text())
    sa, sb = a["summary"]["overall"], b["summary"]["overall"]

    print(f"| Metric | {a_label} | {b_label} |\n|---|---:|---:|")
    for key, label, kind in METRICS:
        if key in sa or key in sb:
            print(f"| {label} | {fmt(sa.get(key), kind)} | {fmt(sb.get(key), kind)} |")

    print(f"\n| Category | Questions | Accuracy ({a_label}) | Accuracy ({b_label}) | Context hit ({a_label}) | Context hit ({b_label}) |")
    print("|---|---:|---:|---:|---:|---:|")
    for cat, ca in a["summary"]["by_category"].items():
        cb = b["summary"]["by_category"].get(cat, {})
        print(f"| {cat} | {ca['questions']} | {fmt(ca.get('answer_accuracy'), 'pct')} | {fmt(cb.get('answer_accuracy'), 'pct')} "
              f"| {fmt(ca.get('context_hit_rate'), 'pct')} | {fmt(cb.get('context_hit_rate'), 'pct')} |")

    print("\nChanged outcomes:")
    rb = {r["id"]: r for r in b["results"]}
    for r in a["results"]:
        other = rb.get(r["id"])
        if other and "answer_score" in r and "answer_score" in other and r["answer_score"]["correct"] != other["answer_score"]["correct"]:
            print(f"- {r['id']} ({r['question']}): {'PASS' if r['answer_score']['correct'] else 'FAIL'} -> "
                  f"{'PASS' if other['answer_score']['correct'] else 'FAIL'}")
            print(f"    {a_label}: {r['answer'][:220]!r}")
            print(f"    {b_label}: {other['answer'][:220]!r}")


if __name__ == "__main__":
    main(*(sys.argv[1:3] if len(sys.argv) >= 3 else ("baseline", "improved")))
