import json
import os
import uuid
from typing import Dict, List, Any, Sequence
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict

from agents.segmentation_agent import segmentation_node
from agents.campaign_agent import campaign_node
from agents.content_agent import content_node
from agents.insights_agent import insights_node

class AgentState(TypedDict):
    messages: Sequence[BaseMessage]
    next: str

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY, temperature=0.1)

system_prompt = """You are the Supervisor for the Xeno CRM AI platform.
Your job is to route the user's request to the correct specialist agent.
- For segmenting users, finding audiences, or filtering data: return 'segmentation'.
- For creating campaigns, setting up broadcasts, or managing schedules: return 'campaign'.
- For drafting emails, writing SMS copy, or creating message templates: return 'content'.
- For viewing metrics, checking performance, or analyzing graphs: return 'insights'.
- If the user is just saying hello, asking a basic question, or testing the system, respond directly and return 'FINISH'.

Respond with ONLY ONE WORD (the agent name or FINISH) unless you are answering directly.
"""

def supervisor_node(state: AgentState) -> Dict:
    messages = state["messages"]
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages")
    ])
    chain = prompt | llm
    res = chain.invoke({"messages": messages})
    
    content = str(res.content).strip()
    
    if content.lower() in ["segmentation", "campaign", "content", "insights"]:
        return {"next": content.lower()}
    else:
        # If the LLM responds directly to a greeting, pass it straight to the UI
        return {"messages": [AIMessage(content=content, additional_kwargs={"agent": "supervisor"})], "next": "FINISH"}

workflow = StateGraph(AgentState)
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("segmentation", segmentation_node)
workflow.add_node("campaign", campaign_node)
workflow.add_node("content", content_node)
workflow.add_node("insights", insights_node)

workflow.add_edge(START, "supervisor")

for node in ["segmentation", "campaign", "content", "insights"]:
    workflow.add_edge(node, END)

workflow.add_conditional_edges(
    "supervisor",
    lambda state: state["next"],
    {
        "segmentation": "segmentation",
        "campaign": "campaign",
        "content": "content",
        "insights": "insights",
        "FINISH": END
    }
)

app = workflow.compile()

def process_chat(message: str, thread_id: str = None, context: Dict = None) -> Dict[str, Any]:
    if not thread_id:
        thread_id = str(uuid.uuid4())
    
    inputs = {"messages": [HumanMessage(content=message)]}
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        final_state = app.invoke(inputs, config=config)
        last_message = final_state["messages"][-1]
        
        # FIX: Ensure we safely extract data whether it's a string or a complex object
        content_out = str(last_message.content) if hasattr(last_message, "content") else str(last_message)
        
        kwargs = getattr(last_message, "additional_kwargs", {})
        agent_name = kwargs.get("agent", "supervisor") if isinstance(kwargs, dict) else "supervisor"
        
        return {
            "response": content_out,
            "agent": agent_name,
            "thread_id": thread_id
        }
    except Exception as e:
        return {
            "response": f"Agent error: {str(e)}",
            "agent": "supervisor"
        }
