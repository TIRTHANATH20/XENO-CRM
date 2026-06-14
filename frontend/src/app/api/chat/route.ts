import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

const AGENTS = ["supervisor", "content", "segmentation", "campaign", "insights", "data"] as const;

type AgentName = (typeof AGENTS)[number];

type Context = {
  stats?: {
    total_customers?: number;
    total_orders?: number;
    total_revenue?: number;
    active_campaigns?: number;
    delivery_rate?: number;
    open_rate?: number;
    click_rate?: number;
    conversion_rate?: number;
  } | null;
  segments?: Array<{ id: number; name: string; description: string; customer_count: number }>;
  campaigns?: Array<{ id: number; name: string; status: string; channel: string; segment_id: number | null }>;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

function pickAgent(message: string): AgentName {
  const text = message.toLowerCase();

  // Meta-routing questions should go to the supervisor agent
  if (/\b(which agent|who should handle|who should (?:handle|be responsible for|be in charge of)|should be handled by|which agent should|which agent to)\b/i.test(message)) {
    return "supervisor";
  }

  // Campaign-related requests (create/launch/send/schedule/promote/email)
  if (/\b(create an email campaign|create campaign|launch campaign|schedule campaign|send (an )?email|promote|campaign|send window)\b/i.test(message)) {
    return "campaign";
  }

  // Insights and performance requests
  if (/\b(performance|metrics|dashboard|conversion|open rate|click rate|delivery rate)\b/i.test(text)) {
    return "insights";
  }

  // Content/copywriting requests (subject, copy, rewrite, draft)
  if (/\b(copy|rewrite|draft|subject|message body|write (an )?(email|subject|copy))\b/i.test(text)) {
    return "content";
  }

  // Segmentation/audience requests (explicit segment creation or audience filters)
  if (/\b(create segment|define segment|segment|audience|target|customers who|filter logic|audience who)\b/i.test(text)) {
    return "segmentation";
  }

  // Data requests: customer records, lookups, return customer by id/email
  if (/\b(customer record|customer_id|customer id|return the customer record|get customer|fetch customer|customer details|customer profile)\b/i.test(text)) {
    return "data" as AgentName;
  }

  // Default to supervisor for ambiguous requests
  return "supervisor";
}

function systemPromptFor(agent: AgentName) {
  switch (agent) {
    case "segmentation":
      return "You are a CRM segmentation specialist for a premium coffee brand. Give concise, actionable audience advice with clear segment logic. Reply in plain text only. Do not use markdown, asterisks, or bullet decoration unless necessary.";
    case "insights":
      return "You are a CRM analytics specialist for a premium coffee brand. Summarize performance clearly, highlight tradeoffs, and keep answers concise. Reply in plain text only with no markdown formatting.";
    case "campaign":
      return "You are a campaign operations specialist for a premium coffee brand. When asked to review or improve campaign copy, include one short insight about the audience or goal, then provide a polished final message. Do not use markdown formatting.";
    case "content":
      return "You are a copy strategist for a premium coffee brand. When asked to write or improve campaign content, first explain the key insight in one sentence, then provide the final message only. Do not use markdown formatting.";
    case "data":
      return "You are a data retrieval specialist for the CRM. When asked for a customer record, return only the requested JSON fields (no explanation). If the record is missing, return an error JSON object.";
    default:
      return "You are the supervising CRM assistant for a premium coffee brand. Route the user's need mentally and reply with a concise, useful answer. Reply in plain text only with no markdown formatting.";
  }
}

function stripFormatting(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`/g, "").trim();
}

function buildContextText(context?: Context) {
  if (!context) return "No CRM context provided.";

  const stats = context.stats
    ? `Stats: shoppers ${context.stats.total_customers ?? 0}, orders ${context.stats.total_orders ?? 0}, revenue ${context.stats.total_revenue ?? 0}, live campaigns ${context.stats.active_campaigns ?? 0}.`
    : "Stats unavailable.";

  const segments = context.segments?.length
    ? `Segments: ${context.segments
        .slice(0, 5)
        .map((segment) => `${segment.name} (${segment.customer_count})`)
        .join(", ")}.`
    : "No segments available.";

  const campaigns = context.campaigns?.length
    ? `Campaigns: ${context.campaigns
        .slice(0, 5)
        .map((campaign) => `${campaign.name} [${campaign.status}/${campaign.channel}]`)
        .join(", ")}.`
    : "No campaigns available.";

  return `${stats} ${segments} ${campaigns}`;
}

function generateFallbackSegmentName(text: string) {
  const lower = text.toLowerCase();
  const inactiveDaysMatch = lower.match(/(?:haven't|have not|not)\s+(?:made\s+a\s+purchase|ordered|purchased)\s+(?:in\s+the\s+last\s+)?(\d+)\s*days?/i)
    || lower.match(/(?:inactive|churn|not ordered).*?(\d+)\s*days?/i);
  if (inactiveDaysMatch) {
    return `Inactive Shoppers ${inactiveDaysMatch[1]} Days`;
  }
  if (/(new shoppers|first order|first purchase)/i.test(text)) {
    return "New Shoppers";
  }
  if (/(high[- ]value|loyal)/i.test(text)) {
    return "High-Value Loyalists";
  }
  if (/win[- ]back/i.test(text)) {
    return "Win-Back Segment";
  }

  const cleaned = text
    .replace(/^This segment (includes|is for)\s*/i, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length > 0 && cleaned.length < 80) {
    return cleaned
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50);
  }
  return `AI segment ${Date.now()}`;
}

function extractSegmentDetails(text: string) {
  const nameMatch = text.match(/Segment Name:\s*([^\n\r]+)/i);
  const quotedNameMatch = text.match(/\bsegment(?: called| named)\s*["“”']?([^"“”']+)["“”']?/i);
  const firstLine = text.split(/\n/)[0].trim();
  const fallbackName = firstLine.match(/^Segment\s*[:\-]\s*(.+)$/i)?.[1]?.trim() || "";

  let name = (nameMatch?.[1] || quotedNameMatch?.[1] || fallbackName || "").trim();
  if (!name || /^this segment/i.test(name)) {
    name = generateFallbackSegmentName(text);
  }

  const countMatch = text.match(/(\d{1,4})\s*(?:customers|shoppers)/i) || text.match(/\((\d{1,4})\)/);
  const customer_count = countMatch ? Number(countMatch[1]) : 60;

  let description = "";
  const logicMatch = text.match(/Logic:\s*([\s\S]+)/i);
  if (logicMatch) {
    description = logicMatch[1].trim().replace(/\n{2,}/g, "\n").split(/\n/).slice(0, 4).join(" ").trim();
  }

  if (!description) {
    const afterName = nameMatch ? text.slice(text.indexOf(nameMatch[0]) + nameMatch[0].length) : text;
    description = afterName.trim().replace(/\n{2,}/g, " ").slice(0, 220).trim();
  }

  if (!description) {
    description = `AI-generated segment for ${name}`;
  }

  return {
    name,
    description,
    customer_count: Math.min(500, Math.max(10, customer_count)),
  };
}

function extractFilterCriteria(text: string): Record<string, any> {
  const criteria: Record<string, any> = {};
  const lowerText = text.toLowerCase();

  // Inactive customers: many patterns like "90+ days", "3 months", "inactive for 60 days", "Order Date is less than or equal to 60 days ago", etc.
  // Recent purchasers: "purchased in last 90 days", "customers who purchased in the last 30 days"
  let recentMatch = lowerText.match(/purchased (?:in the )?last\s+(\d+)\s*days?/i) || lowerText.match(/customers?.*purchased.*?(\d+)\s*days?/i);
  if (recentMatch) {
    criteria.recent_days = Number(recentMatch[1]);
  }

  let inactiveMatch = lowerText.match(/(\d+)\s*(?:\+)?\s*days?\s+(?:inactive|no orders?|haven't ordered|without|not purchased|ago)/i);
  if (!inactiveMatch) {
    inactiveMatch = lowerText.match(/(?:inactive|no orders?|haven't ordered|not purchased)\s+(?:for\s+)?(\d+)\s*(?:\+)?\s*(?:days?|months?|mo)/i);
  }
  if (!inactiveMatch) {
    inactiveMatch = lowerText.match(/(\d+)\s*(?:months?|mo)\s+(?:inactive|no orders?|haven't ordered|without|not purchased)/i);
  }
  if (!inactiveMatch) {
    // Match "Order Date is less than or equal to X days ago" or similar
    inactiveMatch = lowerText.match(/(?:order date|last order).*?less than|fewer than|under|=<|<=|less than or equal\s+(?:to\s+)?(\d+)\s*(?:days?|months?|mo)/i);
  }
  if (!inactiveMatch) {
    // Match "X days without orders" or "not ordered in X days"
    inactiveMatch = lowerText.match(/(?:not ordered|no orders?|without orders?)\s+(?:in|for)\s+(?:the last\s+)?(\d+)\s*(?:days?|months?|mo)/i);
  }
  if (inactiveMatch) {
    const val = Number(inactiveMatch[1]);
    // If it contains "month", convert to days
    if (lowerText.includes("month") || lowerText.includes(" mo ") || lowerText.includes("mo,")) {
      criteria.inactive_days = val * 30;
    } else {
      criteria.inactive_days = val;
    }
  }

  // Spending filters: "spent ₹2000", "2000 rupees", "$500", "minimum 2000", etc.
  let spentMatch = lowerText.match(/(?:spent|spend|minimum|at least|min)\s*[\u20b9$]?\s*(\d+)/i);
  if (!spentMatch) {
    spentMatch = lowerText.match(/[\u20b9$]?\s*(\d+)\s*(?:rupees?|usd|eur|gbp|spent)/i);
  }
  if (spentMatch) {
    criteria.min_total_spent = Number(spentMatch[1]);
  }

  // Order count: "3+ orders", "at least 2 orders", "minimum 5 orders", "2 purchases", etc.
  let orderMatch = lowerText.match(/(\d+)\s*(?:\+)?\s*(?:orders?|purchases?|transactions?)/i);
  if (!orderMatch) {
    orderMatch = lowerText.match(/(?:at least|minimum|min|at least)\s+(\d+)\s*(?:orders?|purchases?|transactions?)/i);
  }
  if (orderMatch) {
    criteria.min_order_count = Number(orderMatch[1]);
  }

  // Location: "from Mumbai", "in Delhi", "city: Paris", "metro: NYC", etc.
  const cityMatch = lowerText.match(/(?:in|from|city|metro|location|based)\s+([A-Z][a-z]+)/);
  if (cityMatch) {
    criteria.city = cityMatch[1];
  }

  // Tags: "with coffee", "tagged coffee", "tag: loyal", "tags: premium", etc.
  const tagMatches = lowerText.match(/(?:with|tag(?:s|ged)?|tagged?)\s+(?:tag)?["']?([a-z]+)["']?/gi);
  if (tagMatches && tagMatches.length > 0) {
    const tags = tagMatches.map((m) => {
      const match = m.match(/(?:with|tag(?:s|ged)?|tagged?)\s+(?:tag)?["']?([a-z]+)["']?/i);
      return match ? match[1] : null;
    }).filter(t => t && t.length > 0);
    if (tags.length > 0) criteria.tags = tags;
  }

  // Channel preference: "email", "whatsapp", "sms", "via email", "through whatsapp", etc.
  const channelMatch = lowerText.match(/(?:via|through|channel|prefer|send|use)\s+([a-z]+)/i);
  if (channelMatch && ["email", "whatsapp", "sms", "rcs", "push"].includes(channelMatch[1].toLowerCase())) {
    criteria.preferred_channel = channelMatch[1].toLowerCase();
  }

  return criteria;
}

function localFallback(message: string, context?: Context) {
  const text = message.toLowerCase();

  if (text.includes("highest-value") || text.includes("loyal")) {
    const loyalSegment = context?.segments?.find((segment) => segment.name.toLowerCase().includes("loyal"));
    if (loyalSegment) {
      return {
        agent: "segmentation" as AgentName,
        response: `${loyalSegment.name} is the best current high-value audience. It has ${loyalSegment.customer_count} shoppers and fits repeat-purchase targeting.`,
      };
    }
  }

  if (text.includes("60 days")) {
    return {
      agent: "segmentation" as AgentName,
      response: "Create a win-back segment for shoppers inactive for 60 days, with at least one prior order and email or WhatsApp as the preferred channel.",
    };
  }

  if (text.includes("whatsapp") && text.includes("message")) {
    return {
      agent: "content" as AgentName,
      response: "Hi {{name}}, we miss your coffee ritual. Come back this week for a special offer on your next order.",
    };
  }

  if (text.includes("review") || text.includes("improve") || text.includes("rewrite") || text.includes("refine")) {
    return {
      agent: "campaign" as AgentName,
      response: "Hi {{name}}, enjoy an exclusive offer on your next order. We’ve refreshed your message for clarity, personalization, and a stronger call to action. Reply now to redeem.",
    };
  }

  return {
    agent: pickAgent(message),
    response: "I can help with segments, message drafts, campaign setup, or campaign performance.",
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;

  try {
    let payload: { message?: string; thread_id?: string; context?: Context } | null = null;
    try {
      payload = (await request.json()) as { message?: string; thread_id?: string; context?: Context };
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { message, thread_id, context } = payload ?? {};

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    let agent = pickAgent(message);

    // Try agents service first (A2A supervisor routing)
    let agentResp: Response | null = null;
    const agentsUrl = process.env.NEXT_PUBLIC_AGENTS_API_URL || "http://localhost:8003";

    // Quick health-check before attempting to call agents service to avoid long connection errors
    try {
      const healthController = new AbortController();
      const healthTimeout = setTimeout(() => healthController.abort(), 1200);
      let healthy = false;
      try {
        const h = await fetch(`${agentsUrl}/health`, { method: "GET", signal: healthController.signal });
        healthy = h.ok;
      } catch (err) {
        console.warn("Agents service health-check failed", err);
        healthy = false;
      } finally {
        clearTimeout(healthTimeout);
      }

      if (healthy) {
        try {
          const agentController = new AbortController();
          const agentTimeout = setTimeout(() => agentController.abort(), 8000);
          try {
            agentResp = await fetch(`${agentsUrl}/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message, thread_id, context }),
              signal: agentController.signal,
            });
            if (!agentResp.ok) {
              console.error("Agent service returned non-ok status", agentResp.status, agentResp.statusText);
            }
          } finally {
            clearTimeout(agentTimeout);
          }
        } catch (error) {
          console.error("Agent service request failed", error);
        }
      } else {
        console.info("Skipping agents service call because health-check failed.");
      }
    } catch (error) {
      console.error("Agents service health-check flow error", error);
    }

    // If agents service succeeded, use it
    if (agentResp?.ok) {
      try {
        const agentData = await agentResp.json();

        // Validate returned agent and prefer campaign when message clearly requests a campaign
        const serviceAgent = agentData?.agent;
        const validServiceAgent = typeof serviceAgent === "string" && (AGENTS as readonly string[]).includes(serviceAgent);

        const hasCampaignKeywords = /campaign|launch|send|schedule|promote|email/i.test(message);
        if (validServiceAgent) {
          if (hasCampaignKeywords && serviceAgent !== "campaign" && agent === "campaign") {
            console.warn("Agent service returned different agent; overriding to 'campaign' based on message keywords.");
            // keep local `agent` as campaign
          } else {
            agent = serviceAgent as AgentName;
          }
        } else {
          console.warn("Agent service returned invalid agent, falling back to local agent:", serviceAgent);
        }

        return NextResponse.json({
          response: agentData.response,
          agent,
          thread_id: agentData.thread_id,
          agents_available: agentData.agents_available || AGENTS,
        });
      } catch (error) {
        console.error("Failed to parse agent service response", error);
      }
    }

    // Fall back to Groq if agents unavailable or if API key is configured
    let externalResp: Response | null = null;
    if (apiKey) {
      // Build the message sequence, including recent history if provided
      const msgs: Array<{ role: string; content: string }> = [];
      msgs.push({ role: "system", content: systemPromptFor(agent) });
      msgs.push({ role: "system", content: `Use this CRM context when relevant: ${buildContextText(context)}` });

      if (context?.messages && Array.isArray(context.messages) && context.messages.length > 0) {
        for (const m of context.messages.slice(-12)) {
          msgs.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
        }
      }

      msgs.push({ role: "user", content: message });

      const groqController = new AbortController();
      const groqTimeout = setTimeout(() => groqController.abort(), 10000);
      try {
        externalResp = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            temperature: 0.2,
            messages: msgs,
          }),
          signal: groqController.signal,
        });
      } catch (error) {
        console.error("Groq API request failed", error);
        externalResp = null;
      } finally {
        clearTimeout(groqTimeout);
      }
    }

    if (!externalResp || !externalResp.ok) {
      const fallback = localFallback(message, context);
      return NextResponse.json({
        response: fallback.response,
        agent: fallback.agent,
        thread_id: thread_id || `thread_${Date.now()}`,
        agents_available: [...AGENTS],
      });
    }

    let data: { choices?: Array<{ message?: { content?: string } }> } | null = null;
    try {
      data = (await externalResp.json()) as { choices?: Array<{ message?: { content?: string } }> };
    } catch {
      data = null;
    }

    if (!data?.choices?.length) {
      const fallback = localFallback(message, context);
      return NextResponse.json({
        response: fallback.response,
        agent: fallback.agent,
        thread_id: thread_id || `thread_${Date.now()}`,
        agents_available: [...AGENTS],
      });
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    const cleanedResponse = stripFormatting(content || "I couldn't generate a response.");

    // Check if segmentation agent should create a segment (segmentation flow)
    let new_segment;
    if (agent === "segmentation" && content) {
      const segmentDetails = extractSegmentDetails(content);
      const filterCriteria = extractFilterCriteria(content);

      // Only auto-create segment if it seems intentional (has specific logic)
      if (Object.keys(filterCriteria).length > 0 || /create|make|new segment/i.test(message)) {
        new_segment = {
          name: segmentDetails.name,
          description: segmentDetails.description,
          customer_count: segmentDetails.customer_count,
          filter_criteria: filterCriteria,
        };
      }
    }

    // Dual-flow: if this is a campaign request that implies an audience, infer and return a new_segment
    if (agent === "campaign") {
      const criteriaFromMessage = extractFilterCriteria(message || content || "");
      if (Object.keys(criteriaFromMessage).length > 0) {
        const inferredName = generateFallbackSegmentName(message || content || "Campaign audience");
        const segmentText = `Segment Name: ${inferredName}\nLogic: ${message || content}`;
        const segmentDetails = extractSegmentDetails(segmentText);

        new_segment = {
          name: segmentDetails.name,
          description: segmentDetails.description,
          customer_count: segmentDetails.customer_count,
          filter_criteria: criteriaFromMessage,
          inferred_from: "campaign",
        };
      }
    }

    const responseData: any = {
      response: cleanedResponse,
      agent,
      thread_id: thread_id || `thread_${Date.now()}`,
      agents_available: [...AGENTS],
    };

    if (new_segment) {
      responseData.new_segment = new_segment;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error." },
      { status: 500 }
    );
  }
}
