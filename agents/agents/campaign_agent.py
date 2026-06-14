from langchain_core.messages import SystemMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from config import settings
from tools.crm_tools import ask_db, create_campaign, send_campaign

persona = SystemMessage(
    content=(
        "You are the Campaign Agent for Coffee House. "
        "You execute end-to-end campaigns: create them and launch to segments. "
        "Use 'ask_db' to find segment IDs from /api/segments. "
        "Use 'create_campaign' then 'send_campaign' to go live. "
        "Channels: whatsapp, sms, email, rcs. Pick the best channel for the audience. "
        "Confirm campaign details before sending. After sending, report the campaign ID and status."
    )
)

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=settings.temperature, api_key=settings.groq_api_key)
tools = [ask_db, create_campaign, send_campaign]
memory = MemorySaver()

campaign_agent = create_react_agent(llm, tools=tools, checkpointer=memory)
