import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { message, thread_id, context } = await req.json();
    
    const response = await fetch("https://xeno-agents-production.up.railway.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, thread_id, context }),
    });

    const data = await response.json();
    
    // Explicitly guarantee a string format for the UI parsing engines
    return NextResponse.json({
      response: typeof data.response === 'string' ? data.response : JSON.stringify(data.response),
      agent: data.agent || "supervisor",
      thread_id: thread_id
    });
  } catch (error: any) {
    return NextResponse.json({ 
      response: `Cloud connection route error: ${error.message}`, 
      agent: "error" 
    });
  }
}
