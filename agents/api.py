from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from supervisor import AGENTS, invoke_supervisor

app = FastAPI(
    title="Xeno Agent Orchestrator",
    description="Multi-agent A2A system for AI-native CRM",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from typing import Optional

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "xeno_session_1"
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    response: str
    agent: str
    agents: list[str] = Field(default_factory=list)
    thread_id: str
    agents_available: list[str] = Field(default_factory=list)


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        result = invoke_supervisor(request.message, request.thread_id, request.context)
        return ChatResponse(
            **result,
            agents_available=list(AGENTS.keys()),
        )
    except Exception as e:
        error_msg = str(e).lower()
        # If API key is missing or invalid
        if "api_key" in error_msg or "authentication" in error_msg or "401" in error_msg:
            raise HTTPException(503, f"Agent service unavailable: Groq API key not configured. {str(e)}")
        raise HTTPException(500, f"Agent error: {e}")


@app.get("/api/agents")
def list_agents():
    return {
        name: {"description": desc}
        for name, (_, _, desc) in AGENTS.items()
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "xeno-agents", "agents": list(AGENTS.keys())}
