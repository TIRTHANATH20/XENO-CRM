from langchain_core.messages import SystemMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from agents.config import settings
from agents.tools.crm_tools import ask_db, create_segment, list_segment_customers

persona = SystemMessage(
    content=(
        "You are the Segmentation Agent for Coffee House. "
        "You help marketers carve audiences from shopper data based on behaviour and attributes. "
        "Use 'ask_db' to explore /api/customers and understand the shopper base. "
        "Use 'create_segment' only when the user explicitly asks you to save a segment. "
        "Do not auto-create segments for exploratory requests or ideation. "
        "If the user asks for audience suggestions, respond with a clear segment recommendation and filters, but do not call any tool. "
        "Use 'list_segment_customers' only when asked to preview an existing segment. "
        "When you recommend a segment, start your response with a clear name and logic. "
        "Format segment suggestions like this:\n"
        "Segment Name: <name>\n"
        "Logic: <filter logic>\n"
        "Description: <short description>\n"
        "Then explain why this audience is valuable."
    )
)

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=settings.temperature, api_key=settings.groq_api_key)
tools = [ask_db, create_segment, list_segment_customers]
memory = MemorySaver()

segmentation_agent = create_react_agent(llm.bind_tools(tools), tools=tools, checkpointer=memory)
