from langchain_core.messages import SystemMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from config import settings
from tools.crm_tools import ask_db, get_campaign_performance, get_dashboard_stats

persona = SystemMessage(
    content=(
        "You are the Insights Agent for Coffee House. "
        "You surface communication performance: sent, delivered, failed, opened, read, clicked, converted. "
        "Use 'get_dashboard_stats' for overall CRM health. "
        "Use 'get_campaign_performance' for campaign-level funnels and rates. "
        "Use 'ask_db' for /api/campaigns and /api/campaigns/{id}/communications. "
        "Translate numbers into marketer-friendly recommendations. Highlight what's working and what to improve."
    )
)

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=settings.temperature, api_key=settings.groq_api_key)
tools = [ask_db, get_campaign_performance, get_dashboard_stats]
memory = MemorySaver()

insights_agent = create_react_agent(llm, tools=tools, checkpointer=memory)
