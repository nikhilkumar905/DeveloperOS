from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_user_data
from indexer import prepare_documents
from rag_engine import build_rag_chain, ingest_documents
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DeveloperOS Chat Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class IndexRequest(BaseModel):
    user_id: str

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        rag_chain = build_rag_chain()
        response = rag_chain.invoke(req.message)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/index")
async def index_endpoint(req: IndexRequest):
    try:
        # Fetch data from MongoDB
        data = await get_user_data(req.user_id)
        
        # Prepare documents
        docs = prepare_documents(data)
        
        # Ingest to ChromaDB
        ingest_documents(docs)
        
        return {"status": "success", "indexed_documents": len(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
