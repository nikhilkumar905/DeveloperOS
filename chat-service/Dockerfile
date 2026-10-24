# DeveloperOS RAG chat service (FastAPI + LangChain + ChromaDB). Build context: ./chat-service
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    ANONYMIZED_TELEMETRY=False \
    HF_HOME=/opt/hf-cache \
    CHROMA_DIR=/data/chroma \
    CHAT_PORT=6502

WORKDIR /app

# CPU-only PyTorch is far smaller than the default CUDA build and is all the embedder needs
COPY requirements.txt .
# chroma-hnswlib (pinned by chromadb) may compile from source, so a C++ compiler is installed only for
# that step and removed in the same layer to keep the image small.
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu \
 && pip install -r requirements.txt \
 && apt-get purge -y --auto-remove build-essential \
 && rm -rf /var/lib/apt/lists/*

# Bake the embedding model into the image so the first request doesn't download it
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

# Unprivileged user; the vector index lives on a volume owned by that user
RUN useradd --create-home --uid 1000 app \
 && mkdir -p /data/chroma \
 && chown -R app /data /app /opt/hf-cache
USER app

EXPOSE 6502

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:6502/api/health', timeout=4).status == 200 else 1)"

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${CHAT_PORT}"]
