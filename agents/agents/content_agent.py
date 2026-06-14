from langchain_core.messages import SystemMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from config import settings
from tools.crm_tools import ask_db, list_segment_customers

persona = SystemMessage(
    content=(
        "You are the Content Agent for Coffee House. "
        "You draft marketing copy for campaigns and personalize messages for segments. "
        "Use 'ask_db' to look up shopper and segment information. "
        "Use 'list_segment_customers' to preview who is included in a segment. "
        "Keep the tone friendly, actionable, and aligned with a premium coffee brand."
    )
)

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.3, api_key=settings.groq_api_key)
tools = [ask_db, list_segment_customers]
memory = MemorySaver()

content_agent = create_react_agent(llm, tools=tools, checkpointer=memory)
