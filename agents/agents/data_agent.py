from langchain_core.messages import SystemMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from config import settings
from tools.crm_tools import ask_db, get_dashboard_stats

persona = SystemMessage(
    content=(
        "You are the Data Agent for Coffee House's CRM. "
        "You answer questions about shoppers, orders, and CRM state. "
        "Use 'ask_db' to fetch data from endpoints: /api/customers, /api/segments, /api/campaigns. "
        "Use 'get_dashboard_stats' for high-level metrics. "
        "Tables/entities: Customer (name, email, city, total_spent, order_count, tags, preferred_channel), "
        "Order, Segment, Campaign, Communication. Be concise and data-driven."
    )
)

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=settings.temperature, api_key=settings.groq_api_key)
tools = [ask_db, get_dashboard_stats]
memory = MemorySaver()

data_agent = create_react_agent(llm.bind_tools(tools), tools=tools, checkpointer=memory)
