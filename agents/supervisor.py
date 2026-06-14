"""
A2A Supervisor — routes marketer intent to the right specialist agent.
Each specialist is a LangGraph ReAct agent with its own tools and memory.
"""
from typing import Annotated, Literal, Optional
import uuid

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from agents.campaign_agent import campaign_agent, persona as campaign_persona
from agents.content_agent import content_agent, persona as content_persona
from agents.data_agent import data_agent, persona as data_persona
from agents.insights_agent import insights_agent, persona as insights_persona
from agents.segmentation_agent import segmentation_agent, persona as segmentation_persona
from config import settings

AGENTS = {
    "data": (data_agent, data_persona, "Shopper data & CRM state queries"),
    "segmentation": (segmentation_agent, segmentation_persona, "Audience carving & segments"),
    "content": (content_agent, content_persona, "Message drafting & personalization"),
    "campaign": (campaign_agent, campaign_persona, "Campaign creation & launch"),
    "insights": (insights_agent, insights_persona, "Performance analytics & recommendations"),
}

ROUTER_PROMPT = SystemMessage(
    content=(
        "You are the Xeno CRM Supervisor for Coffee House. "
        "Answer the marketer with a recommended workflow and route the request to one or more specialist agents.\n\n"
        "Agents:\n"
        "- data: shopper and CRM state queries\n"
        "- segmentation: create/find audiences and target audiences\n"
        "- content: write and personalize message copy\n"
        "- campaign: create, launch, and optimize campaigns\n"
        "- insights: analyze performance, explain metrics, and recommend next steps\n\n"
        "If the request benefits from collaboration, return multiple agent names separated by commas.\n"
        "Also include a short reasoning summary that explains why each agent is relevant.\n"
        "Reply with only the agent names and optional brief reasoning in one line, for example:\n"
        "segmentation, content -- segment inactive customers, then write a WhatsApp draft."
    )
)


class SupervisorState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    next_agent: str
    thread_id: str


llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0, api_key=settings.groq_api_key)
memory = MemorySaver()


def normalize_agent_names(agent_text: str) -> list[str]:
    candidates = [part.strip().lower().replace("agent", "").strip() for part in agent_text.split(",")]
    normalized: list[str] = []
    for candidate in candidates:
        if not candidate:
            continue
        if candidate in AGENTS:
            normalized.append(candidate)
            continue
        # allow multi-word or ranked text to resolve to known agents
        for key in AGENTS:
            if key in candidate:
                normalized.append(key)
                break
    if not normalized:
        normalized = ["data"]
    return list(dict.fromkeys(normalized))


def route_intent(state: SupervisorState) -> SupervisorState:
    last_human = next((m.content for m in reversed(state["messages"]) if isinstance(m, HumanMessage)), "")
    response = llm.invoke([ROUTER_PROMPT, HumanMessage(content=last_human)])
    agent_text = response.content.strip().lower()
    if "--" in agent_text:
        agent_text = agent_text.split("--")[0].strip()
    return {"next_agent": agent_text}


def run_specialist(state: SupervisorState) -> SupervisorState:
    agent_text = state["next_agent"]
    agent_names = normalize_agent_names(agent_text)
    outputs = []

    for agent_name in agent_names:
        agent, persona, _ = AGENTS[agent_name]
        config = {"configurable": {"thread_id": f"{state['thread_id']}_{agent_name}"}}

        input_messages = [persona]
        input_messages.extend(state["messages"])

        result = agent.invoke({"messages": input_messages}, config)
        reply = result["messages"][-1].content
        outputs.append({"agent": agent_name, "response": reply})

    combined = "\n\n".join([f"[{item['agent'].upper()}] {item['response']}" for item in outputs])
    return {
        "messages": [
            AIMessage(
                content=combined,
                additional_kwargs={
                    "agent": agent_names[0] if len(agent_names) == 1 else "supervisor",
                    "agents": agent_names,
                    "routed_by": "supervisor",
                },
            )
        ]
    }


def build_supervisor_graph():
    graph = StateGraph(SupervisorState)
    graph.add_node("router", route_intent)
    graph.add_node("specialist", run_specialist)
    graph.add_edge(START, "router")
    graph.add_edge("router", "specialist")
    graph.add_edge("specialist", END)
    return graph.compile(checkpointer=memory)


supervisor_app = build_supervisor_graph()


from typing import Optional

def build_messages_from_context(context: Optional[list[dict]]) -> list[BaseMessage]:
    if not context:
        return []
    messages: list[BaseMessage] = []
    for item in context:
        role = item.get("role")
        content = item.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))
    return messages


def invoke_supervisor(user_input: str, thread_id: Optional[str] = None, context: Optional[list[dict]] = None) -> dict:
    if not thread_id:
        thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    history_messages = build_messages_from_context(context)
    state_messages = [*history_messages, HumanMessage(content=user_input)]
    result = supervisor_app.invoke(
        {"messages": state_messages, "thread_id": thread_id, "next_agent": ""},
        config,
    )
    last = result["messages"][-1]
    return {
        "response": last.content,
        "agent": last.additional_kwargs.get("agent", "unknown"),
        "agents": last.additional_kwargs.get("agents", []),
        "thread_id": thread_id,
    }
