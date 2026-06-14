import streamlit as st
import requests

# Ensure the header only renders once using session state
if "brief_header" not in st.session_state:
    st.subheader("Campaign brief")
    st.session_state.brief_header = True

# Your existing logic continues here...
# (Keep your campaign input and generation logic below this)

st.sidebar.subheader("Live Campaign Status")
if st.sidebar.button("Refresh Status", key="refresh_campaign_status"):
    try:
        response = requests.get("https://xeno-agents-production.up.railway.app/api/communications", timeout=5)
        data = response.json()
        if not data:
            st.sidebar.info("No campaigns sent yet.")
        else:
            for comm_id, info in data.items():
                status = info.get('status', 'queued')
                color = "green" if status in ['delivered', 'opened', 'clicked'] else "orange"
                st.sidebar.markdown(f"**ID:** `{comm_id}` | **Status:** :{color}[{status.upper()}]")
    except:
        st.sidebar.error("Service unreachable.")
