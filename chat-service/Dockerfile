# DeveloperOS RAG chat service (FastAPI + LangChain + ChromaDB). Build context: ./chat-service
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    ANONYMIZED_TELEMETRY=False \
    CHROMA_DIR=/data/chroma \
    CHAT_PORT=6502

WORKDIR /app

# chroma-hnswlib (pinned by chromadb) may compile from source, so a C++ compiler is installed only for
# that step and removed in the same layer to keep the image small.
COPY requirements.txt .
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && pip install -r requirements.txt \
 && apt-get purge -y --auto-remove build-essential \
 && rm -rf /var/lib/apt/lists/*

# Unprivileged user; the vector index lives on a volume owned by that user
RUN useradd --create-home --uid 1000 app \
 && mkdir -p /data/chroma \
 && chown -R app /data /app
USER app

# Bake the ONNX embedding model (all-MiniLM-L6-v2, ~80 MB) into the user's cache so startup doesn't download it
RUN python -c "from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2; ONNXMiniLM_L6_V2()(['warm up'])"

COPY --chown=app . .

EXPOSE 6502

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request,sys,os; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', os.environ.get('CHAT_PORT', '6502')) + '/api/health', timeout=4).status == 200 else 1)"

# Hosting platforms such as Render assign the port through $PORT; locally CHAT_PORT (6502) is used
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-$CHAT_PORT} --proxy-headers --forwarded-allow-ips='*'"]
