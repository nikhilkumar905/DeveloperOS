import math
import os
import re

# Chroma's bundled telemetry client is broken in this version and only spams the log
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

from typing import List, Tuple
import numpy as np
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser

PERSIST_DIR = os.getenv("CHROMA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db"))
EMBEDDING_MODEL = "all-MiniLM-L6-v2 (ONNX)"
# llama-3.1-8b-instant was retired by Groq; gpt-oss-20b is the fast general model now
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

# Retrieval budget. Kept small on purpose: Groq's free tier has tight tokens-per-minute limits.
TOP_K = 4                 # hybrid-search results added after routed/entity matches
FETCH_K = 20              # candidates considered by each ranker
RRF_K = 60                # reciprocal-rank-fusion constant (standard value)
MAX_CONTEXT_CHARS = 6000
MAX_DOC_CHARS = 1200
MAX_CATALOG_CHARS = 4000  # the repository catalog lists every repo, so it gets a larger cap
MAX_HISTORY_TURNS = 6

# Bump when indexer.py changes what gets indexed, so existing users are re-indexed automatically
INDEX_VERSION = 5



class MiniLMEmbeddings(Embeddings):
    """all-MiniLM-L6-v2 run with ONNX Runtime instead of PyTorch.

    Uses the model files ChromaDB ships/downloads, with a lean inference session: no memory arena,
    few threads and small batches. Peak memory while indexing a profile drops from ~500 MB to ~270 MB,
    which keeps the service inside small instances such as Render's 512 MB free tier. Retrieval quality
    is unchanged on the evaluation set (see chat-service/eval)."""

    MAX_TOKENS = 256  # same as sentence-transformers' max_seq_length for this model
    BATCH_SIZE = 4

    def __init__(self):
        import onnxruntime as ort
        from tokenizers import Tokenizer

        files = ONNXMiniLM_L6_V2()
        files._download_model_if_not_exists()
        folder = files.DOWNLOAD_PATH / files.EXTRACTED_FOLDER_NAME
        self._tokenizer = Tokenizer.from_file(str(folder / "tokenizer.json"))
        self._tokenizer.enable_truncation(max_length=self.MAX_TOKENS)
        self._tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")

        options = ort.SessionOptions()
        options.enable_cpu_mem_arena = False  # release memory after each batch instead of pooling it
        options.intra_op_num_threads = int(os.getenv("EMBED_THREADS", "2"))
        options.inter_op_num_threads = 1
        self._session = ort.InferenceSession(str(folder / "model.onnx"), sess_options=options, providers=["CPUExecutionProvider"])

    def _embed(self, texts: List[str]) -> List[List[float]]:
        vectors = []
        for i in range(0, len(texts), self.BATCH_SIZE):
            encoded = self._tokenizer.encode_batch(texts[i:i + self.BATCH_SIZE])
            ids = np.array([e.ids for e in encoded], dtype=np.int64)
            mask = np.array([e.attention_mask for e in encoded], dtype=np.int64)
            hidden = self._session.run(None, {"input_ids": ids, "attention_mask": mask, "token_type_ids": np.zeros_like(ids)})[0]
            pooled = (hidden * mask[..., None]).sum(1) / np.clip(mask.sum(1, keepdims=True), 1e-9, None)  # mean pooling
            vectors.extend((pooled / np.linalg.norm(pooled, axis=1, keepdims=True)).tolist())
        return vectors

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._embed(texts)

    def embed_query(self, text: str) -> List[float]:
        return self._embed([text])[0]


embeddings = MiniLMEmbeddings()

# Query words that point at a specific document source/type; matched against metadata
# so e.g. "what's my gfg score" always pulls the GeeksforGeeks doc even if embeddings miss it.
KEYWORD_ROUTES = [
    (r"\b(gfg|geeks ?for ?geeks|geeksforgeeks|potd)\b", "source", "geeksforgeeks"),
    (r"\b(leetcode|lc)\b", "source", "leetcode"),
    (r"\b(dsa|problems?|solved|coding platforms?|competitive)\b", "type", "coding_platform"),
    (r"\b(activity|streak|hours|time spent|productiv\w*)\b", "source", "activity"),
    (r"\b(education|college|university|degree|gpa|school)\b", "type", "education"),
    (r"\b(experience|work|job|intern\w*|company)\b", "type", "experience"),
    (r"\b(certificat\w*)\b", "type", "certification"),
    (r"\b(hackathons?)\b", "type", "hackathon"),
    (r"\b(achievements?|awards?)\b", "type", "achievement"),
    (r"\b(weak\w*|improve\w*)\b", "type", "weakness"),
    (r"\b(strength\w*|good at|best at)\b", "type", "strength"),
    (r"\b(roadmap|next steps?|learn next|plan)\b", "type", "roadmap"),
    (r"\b(scores?|rating|rank)\b", "type", "score"),
    (r"\b(resume|cv|ats|objective)\b", "type", "summary"),
]

SYSTEM_PROMPT = """You are the AI assistant built into DeveloperOS, and you speak to the developer about their own profile.
Answer using ONLY the facts in the profile context below (GitHub repositories, LeetCode, GeeksforGeeks, resume, activity, skill scores and knowledge graph).

Rules:
- Be concise and direct; answer exactly what was asked. Use short "- " bullet lists when listing several items.
- Reply in plain text: no Markdown bold, headings, tables or code formatting (the chat window does not render Markdown).
- When asked about frameworks, libraries, package.json or requirements.txt, look at "Dependencies and libraries used" and "Key project files".
- Quote numbers exactly as they appear in the context. Never invent repositories, numbers, companies or skills.
- For "which/list/how many" questions, check every item's fields in the context and list only the items that match. Never list non-matching items, and do not show your working.
- If the context does not contain the answer, say you don't have that information in their profile yet and, when relevant, suggest connecting the platform or clicking "Update Knowledge Base".
- Speak naturally ("You have solved...", "Your repo X uses..."). Do not say "based on the provided context".
- Use an encouraging, professional tone.

Profile context:
{context}"""

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    MessagesPlaceholder("history"),
    ("human", "{question}"),
])


def get_llm():
    # Will throw if GROQ_API_KEY is not in env
    # gpt-oss models spend part of max_tokens on reasoning; keep that short
    return ChatGroq(model=GROQ_MODEL, temperature=0, max_tokens=1500, model_kwargs={"reasoning_effort": "low"})


def _collection_name(user_id: str) -> str:
    return f"user_{user_id}"


def _store(user_id: str) -> Chroma:
    return Chroma(collection_name=_collection_name(user_id), persist_directory=PERSIST_DIR, embedding_function=embeddings)


def ingest_documents(user_id: str, docs: List[Document]) -> int:
    """Replace the user's collection with a fresh index. Each user has their own collection,
    so re-indexing one user can never wipe or leak another user's data."""
    store = _store(user_id)
    try:
        store.delete_collection()
    except Exception:
        pass
    if not docs:
        return 0
    store = _store(user_id)
    for d in docs:
        d.metadata["index_version"] = INDEX_VERSION
    ids = [f"{d.metadata.get('source')}:{d.metadata.get('type')}:{i}" for i, d in enumerate(docs)]
    store.add_documents(documents=docs, ids=ids)
    return len(docs)


def is_indexed(user_id: str) -> bool:
    """True when the user has an index built by the current indexer; older indexes get rebuilt on next chat."""
    try:
        found = _store(user_id)._collection.get(where={"index_version": INDEX_VERSION}, limit=1)
        return len(found["ids"]) > 0
    except Exception:
        return False


def _search_query(question: str, history: List[Tuple[str, str]]) -> str:
    """Short follow-ups ("and its stack?") carry little signal on their own, so fold in the previous user turn."""
    previous = next((text for role, text in reversed(history) if role == "human"), "")
    if previous and len(question.split()) <= 6:
        return f"{previous} {question}"
    return question


# Questions that need every repository at once ("which repos use React?", "most starred project")
# get the repository catalog, since top-k over per-repo documents can't guarantee full coverage.
CATALOG_INTENT = re.compile(
    r"\b(which|what|list|all|how many|every|any|most|least|top|best|compare)\b[^?]*\b(repos?|repositories|projects)\b"
    r"|\b(repos?|repositories|projects)\b[^?]*\b(use|uses|using|written|built|have|has|with|starred)\b"
    r"|\bmost starred\b",
    re.IGNORECASE,
)

_TOKEN = re.compile(r"[a-z0-9]+(?:[.+#][a-z0-9]+)*")
_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "do", "does", "did", "i", "my", "me", "of", "on", "in", "to", "for",
    "and", "or", "what", "which", "how", "many", "much", "have", "has", "with", "use", "uses", "using", "it", "its",
    "about", "tell", "your", "you", "at", "by", "from", "this", "that", "be", "can", "any", "all",
}


def _tokens(text: str) -> List[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOPWORDS]


def _bm25_ranking(query: str, docs: List[Document], k1: float = 1.5, b: float = 0.75) -> List[int]:
    """Indices of docs with any lexical match, best first. Catches exact names (socket.io, FastAPI, pytest)
    that small embedding models blur together."""
    q_terms = set(_tokens(query))
    if not q_terms:
        return []
    doc_tokens = [_tokens(d.page_content + " " + str(d.metadata.get("name", ""))) for d in docs]
    avg_len = sum(len(t) for t in doc_tokens) / len(doc_tokens) or 1.0
    n = len(docs)
    df = {term: sum(1 for toks in doc_tokens if term in toks) for term in q_terms}
    scores = []
    for i, toks in enumerate(doc_tokens):
        score = 0.0
        for term in q_terms:
            tf = toks.count(term)
            if tf:
                idf = math.log(1 + (n - df[term] + 0.5) / (df[term] + 0.5))
                score += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * len(toks) / avg_len))
        if score > 0:
            scores.append((score, i))
    return [i for _, i in sorted(scores, reverse=True)]


def _name_variants(name: str) -> List[str]:
    """'trailmix-api' should match 'trailmix api' and 'trailmix_api' in a question."""
    base = name.lower()
    return list({base, re.sub(r"[-_]", " ", base), re.sub(r"[-_ ]", "", base)})


def retrieve(user_id: str, question: str, history: List[Tuple[str, str]]) -> List[Document]:
    store = _store(user_id)
    query = _search_query(question, history)
    lowered = query.lower()

    stored = store.get(include=["documents", "metadatas"])
    all_docs = [Document(page_content=text, metadata=meta or {}) for text, meta in zip(stored["documents"], stored["metadatas"])]
    if not all_docs:
        return []

    picked: List[Document] = []
    seen = set()

    def add(doc: Document):
        if doc.page_content not in seen:
            seen.add(doc.page_content)
            picked.append(doc)

    # 1. Exact entity matches: repository/project/company names mentioned in the question
    for d in all_docs:
        name = (d.metadata.get("name") or "")
        if len(name) < 3 or name.lower() in ("overview", "resume", "catalog"):
            continue
        if any(re.search(rf"(?<![\w-]){re.escape(v)}(?![\w-])", lowered) for v in _name_variants(name)):
            add(d)

    # 2. Keyword routes to specific sources/types
    for pattern, field, value in KEYWORD_ROUTES:
        if re.search(pattern, lowered):
            for d in all_docs:
                if d.metadata.get(field) == value:
                    add(d)

    # 3. Whole-portfolio questions get the repository catalog
    if CATALOG_INTENT.search(lowered):
        for d in all_docs:
            if d.metadata.get("type") == "repo_catalog":
                add(d)

    # 4. Hybrid search: reciprocal-rank fusion of lexical (BM25) and dense (embedding) rankings
    dense = store.similarity_search(query, k=min(FETCH_K, len(all_docs)))
    position = {d.page_content: i for i, d in enumerate(all_docs)}
    fused: dict = {}
    for rank, d in enumerate(dense):
        i = position.get(d.page_content)
        if i is not None:
            fused[i] = fused.get(i, 0.0) + 1 / (RRF_K + rank + 1)
    for rank, i in enumerate(_bm25_ranking(query, all_docs)[:FETCH_K]):
        fused[i] = fused.get(i, 0.0) + 1 / (RRF_K + rank + 1)
    for i, _ in sorted(fused.items(), key=lambda kv: kv[1], reverse=True)[:TOP_K]:
        add(all_docs[i])

    # 5. Overview last: useful grounding for broad questions, but specific evidence should come first
    for d in all_docs:
        if d.metadata.get("type") == "overview":
            add(d)

    return picked


def _doc_text(doc: Document) -> str:
    limit = MAX_CATALOG_CHARS if doc.metadata.get("type") == "repo_catalog" else MAX_DOC_CHARS
    return doc.page_content[:limit]


def select_context(docs: List[Document]) -> List[Document]:
    """The retrieved docs that fit in the context budget, in order — exactly what the LLM sees.
    A doc that doesn't fit is skipped (not a hard stop), so a smaller later doc can still be included."""
    selected, used = [], 0
    for doc in docs:
        size = len(_doc_text(doc))
        if used + size > MAX_CONTEXT_CHARS:
            continue
        selected.append(doc)
        used += size
    return selected


def format_docs(docs: List[Document]) -> str:
    return "\n\n".join(f"[{doc.metadata.get('source', 'profile')}] {_doc_text(doc)}" for doc in select_context(docs))


def normalize_history(history) -> List[Tuple[str, str]]:
    turns = []
    for item in (history or [])[-MAX_HISTORY_TURNS:]:
        role = "human" if item.get("role") == "user" else "ai"
        text = (item.get("content") or "").strip()
        if text:
            turns.append((role, text[:1000]))
    return turns


async def answer(question: str, history: List[Tuple[str, str]], docs: List[Document]) -> str:
    chain = prompt | get_llm() | StrOutputParser()
    text = await chain.ainvoke({"context": format_docs(docs), "history": history, "question": question})
    return _strip_markdown(text)


def _strip_markdown(text: str) -> str:
    """The chat widget renders plain text, so drop the Markdown the model sometimes emits anyway."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    return re.sub(r"[ \t]+\n", "\n", text).strip()
