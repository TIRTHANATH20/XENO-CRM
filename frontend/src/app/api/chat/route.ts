import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const response = await fetch("https://xeno-agents-production.up.railway.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    // Extract the raw text
    const finalString = typeof data.response === 'string' ? data.response : 
                        typeof data.content === 'string' ? data.content : JSON.stringify(data);

    // Flood the response object so the UI parser cannot miss it
    return NextResponse.json({
      response: finalString,
      content: finalString,
      text: finalString,
      message: finalString,
      agent: data.agent || "supervisor",
      thread_id: body.thread_id
    });
  } catch (error: any) {
    return NextResponse.json({ 
      content: `Cloud connection route error: ${error.message}`, 
      agent: "error" 
    });
  }
}
