import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Setup components
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

def get_llm():
    # Will throw if GROQ_API_KEY is not in env
    return ChatGroq(model="llama-3.1-8b-instant", temperature=0)

template = """You are an AI assistant built into DeveloperOS, representing the user's personal developer profile. 
Use the following pieces of retrieved context to answer the question about the user's skills, projects, repositories, or weaknesses.
When asked about frameworks, package.json, requirements.txt, or readmes, explicitly search the provided context (especially 'Dependencies and libraries used') to find the related contents or frameworks and return ONLY the necessary asked answer.
Give concise, direct answers. Do NOT give long replies or out-of-context information. Give ONLY the necessary asked answer of the question.
If you don't know the answer, just say that you don't have that information in the profile. Do not make up information.
Use an encouraging and professional tone.
CRITICAL INSTRUCTION: Answer naturally and conversationally. Do NOT use robotic phrasing like "Based on the provided context" or "According to the context". Speak as if you inherently know this information about the user's profile.

Context:
{context}

Question: {question}

Answer:"""
prompt = PromptTemplate.from_template(template)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def build_rag_chain():
    llm = get_llm()
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    return rag_chain

def ingest_documents(docs):
    if len(docs) > 0:
        vectorstore.add_documents(documents=docs)
