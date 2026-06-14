from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import random
import time
import requests

app = FastAPI(title="Xeno Mock Channel Gateway")

class MessagePayload(BaseModel):
    id: str
    recipient: str
    message: str
    crm_url: str

def simulate_delivery_lifecycle(payload: MessagePayload):
    """Simulates an external messaging provider delivering a message asynchronously."""
    # 1. Simulate network/provider latency (5 seconds)
    time.sleep(5)
    
    # 2. Pick a realistic random delivery outcome
    outcomes = ["delivered", "opened", "clicked", "failed"]
    final_status = random.choice(outcomes)
    
    # 3. Fire the asynchronous webhook callback to the CRM Receipt API
    receipt_endpoint = f"{payload.crm_url}/api/receipt"
    try:
        print(f"[GATEWAY] Message {payload.id} resolved to {final_status}. Sending callback...")
        requests.post(receipt_endpoint, json={
            "communication_id": payload.id,
            "status": final_status
        }, timeout=5)
    except Exception as e:
        print(f"[GATEWAY ERROR] Callback failed to reach CRM: {e}")

@app.post("/send")
def process_outbound_message(payload: MessagePayload, background_tasks: BackgroundTasks):
    """Main outbound hook called by the CRM."""
    background_tasks.add_task(simulate_delivery_lifecycle, payload)
    return {"status": "queued", "communication_id": payload.id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
