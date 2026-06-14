"use client";

import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import { Send, Bot, User, Coffee } from "lucide-react";
import { api, type Campaign, type DashboardStats, type Segment } from "@/lib/api";
import { AgentBadge } from "./AgentBadge";
import { sanitizeAssistantText } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  agent?: string;
}

function generateFallbackSegmentName(text: string) {
  const lower = text.toLowerCase();
  const inactiveDaysMatch =
    lower.match(/(?:haven't|have not|not)\s+(?:made\s+a\s+purchase|ordered|purchased)\s+(?:in\s+the\s+last\s+)?(\d+)\s*days?/i) ||
    lower.match(/(?:inactive|churn|not ordered).*?(\d+)\s*days?/i);
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

export function ChatPanel({
  onRefresh,
  stats,
  segments,
  campaigns,
  onApplySuggestion,
  messages,
  setMessages,
  threadId,
}: {
  onRefresh?: () => void;
  stats?: DashboardStats | null;
  segments?: Segment[];
  campaigns?: Campaign[];
  onApplySuggestion?: (text: string) => void;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  threadId: string;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // persist chat messages in sessionStorage so they survive route changes
  const STORAGE_KEY = "xeno_chat_messages";
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
  }, [messages]);

  // Load persisted messages from sessionStorage on mount (if any)
  useEffect(() => {
    try {
      const raw =
        window.sessionStorage.getItem(STORAGE_KEY) ||
        window.sessionStorage.getItem("xeno_ai_assistant_messages") ||
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem("xeno_ai_assistant_messages");
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      // ignore parse errors
    }

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === STORAGE_KEY || e.key === "xeno_ai_assistant_messages") {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          if (Array.isArray(parsed)) setMessages(parsed as Message[]);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    setHydrated(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    if (!hydrated) return;
    try {
      const json = JSON.stringify(messages);
      window.sessionStorage.setItem(STORAGE_KEY, json);
      try { window.sessionStorage.setItem("xeno_ai_assistant_messages", json); } catch {}
      try { window.localStorage.setItem(STORAGE_KEY, json); window.localStorage.setItem("xeno_ai_assistant_messages", json); } catch {}
    } catch (e) {
      // ignore storage errors
    }
  }, [messages, hydrated]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      // send recent history so assistant has memory
      const history: Array<{ role: "user" | "assistant"; content: string }> = [...messages, { role: "user", content: text }]
        .slice(-10)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const res = await api.chat(text, threadId, { stats, segments, campaigns, messages: history });

      // If the assistant returned a new segment payload, persist it to the demo DB
      // and refresh the UI so segments update in real time.
      let duplicateSegmentSkipped = false;
      const assistantMessages: Message[] = [
        { role: "assistant", content: sanitizeAssistantText(res.response), agent: res.agent },
      ];

      setMessages((m) => [...m, ...assistantMessages]);
      onRefresh?.();
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "AI is temporarily unavailable. You can still create segments and campaigns from the demo data.",
          agent: "supervisor",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card flex h-full min-h-0 flex-col overflow-hidden border border-coffee-border">
      <div className="flex items-center gap-3 border-b border-coffee-border bg-panel-surface px-5 py-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-coffee-highlight-strong text-coffee-cream">
          <Coffee className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-coffee-text">AI Marketing Assistant</h2>
          <p className="text-xs text-coffee-muted">Segments, copy, campaigns</p>
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 h-full flex-1 space-y-4 overflow-y-auto bg-panel-surface p-5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-slide-up min-w-0 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                msg.role === "user"
                  ? "bg-panel-surface text-coffee-text"
                  : "bg-panel-surface text-coffee-muted-strong"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[90%] min-w-0 ${msg.role === "user" ? "text-right" : ""}`}>
              {msg.agent && msg.role === "assistant" && (
                <div className="mb-1.5">
                  <AgentBadge agent={msg.agent} />
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words border ${
                  msg.role === "user"
                    ? "bg-panel-surface border border-coffee-border text-coffee-text"
                      : "bg-panel-surface border border-coffee-border text-coffee-text"
                }`}
              >
                {msg.content}
              </div>

              {/* If assistant suggested a segment, show a quick 'Add segment' button */}
              {msg.agent === "segmentation" && msg.role === "assistant" &&
                /(create\s.*segment|segment name|win-back|inactive|win back)/i.test(msg.content) &&
                !/^(created segment|a segment named|a segment with that name already exists|i did not create a duplicate)/i.test(
                  msg.content.trim()
                ) && (
                <div className="mt-2 flex gap-2">
                  <button
                    className="text-sm rounded-full border px-3 py-1 bg-panel-surface"
                    onClick={async () => {
                      const segment = extractSegmentDetails(msg.content);
                      const payload: { name: string; customer_count: number; description?: string; filter_criteria?: Record<string, any> } = {
                        name: segment.name,
                        customer_count: segment.customer_count,
                      };
                      if (/description|describe|details?/i.test(msg.content)) {
                        payload.description = segment.description;
                      }
                      // Extract filter criteria from the message
                      const criteria: Record<string, any> = {};
                      const msgLower = msg.content.toLowerCase();
                      
                      // Inactive: "90+ days", "3 months", "inactive 60 days", etc.
                      let inactiveMatch = msgLower.match(/(\d+)\s*(?:\+)?\s*days?\s+(?:inactive|no orders?|haven't ordered|without|not purchased)/i);
                      if (!inactiveMatch) inactiveMatch = msgLower.match(/(?:inactive|no orders?|haven't ordered|not purchased)\s+(?:for\s+)?(\d+)\s*(?:\+)?\s*(?:days?|months?|mo)/i);
                      if (!inactiveMatch) inactiveMatch = msgLower.match(/(\d+)\s*(?:months?|mo)\s+(?:inactive|no orders?|haven't ordered|without|not purchased)/i);
                      if (inactiveMatch) {
                        const val = Number(inactiveMatch[1]);
                        if (msgLower.includes("month") || msgLower.includes(" mo ") || msgLower.includes("mo,")) {
                          criteria.inactive_days = val * 30;
                        } else {
                          criteria.inactive_days = val;
                        }
                      }
                      
                      // Spending: "₹2000", "$500", "minimum 2000", etc.
                      let spentMatch = msgLower.match(/(?:spent|spend|minimum|at least|min)\s*[\u20b9$]?\s*(\d+)/i);
                      if (!spentMatch) spentMatch = msgLower.match(/[\u20b9$]?\s*(\d+)\s*(?:rupees?|usd|eur|gbp|spent)/i);
                      if (spentMatch) criteria.min_total_spent = Number(spentMatch[1]);
                      
                      // Orders: "3+ orders", "minimum 2 orders", etc.
                      let orderMatch = msgLower.match(/(\d+)\s*(?:\+)?\s*(?:orders?|purchases?|transactions?)/i);
                      if (!orderMatch) orderMatch = msgLower.match(/(?:at least|minimum|min)\s+(\d+)\s*(?:orders?|purchases?|transactions?)/i);
                      if (orderMatch) criteria.min_order_count = Number(orderMatch[1]);
                      
                      // City: "from Mumbai", "in Delhi", etc.
                      const cityMatch = msgLower.match(/(?:in|from|city|metro|location|based)\s+([A-Z][a-z]+)/);
                      if (cityMatch) criteria.city = cityMatch[1];
                      
                      // Tags: "with coffee", "tagged loyal", etc.
                      const tagMatches = msgLower.match(/(?:with|tag(?:s|ged)?|tagged?)\s+(?:tag)?["']?([a-z]+)["']?/gi);
                      if (tagMatches && tagMatches.length > 0) {
                        const tags = tagMatches.map((m) => {
                          const match = m.match(/(?:with|tag(?:s|ged)?|tagged?)\s+(?:tag)?["']?([a-z]+)["']?/i);
                          return match ? match[1] : null;
                        }).filter(t => t && t.length > 0);
                        if (tags.length > 0) criteria.tags = tags;
                      }
                      
                      if (Object.keys(criteria).length > 0) payload.filter_criteria = criteria;
                      const normalizedName = payload.name.trim().toLowerCase();
                      if (
                        segments?.some((segment) => segment.name.trim().toLowerCase() === normalizedName)
                      ) {
                        setMessages((m) => [
                          ...m,
                          {
                            role: "assistant",
                            content: `A segment named '${payload.name}' already exists, so I did not create a duplicate.`,
                            agent: "segmentation",
                          },
                        ]);
                        return;
                      }

                      try {
                        const created = await api.createSegment(payload);
                        onRefresh?.();
                        try { window.dispatchEvent(new Event("segments:updated")); } catch {}
                        setMessages((m) => [
                          ...m,
                          {
                            role: "assistant",
                            content: `Created segment '${created.name}' and saved it to your audiences.`,
                            agent: "segmentation",
                          },
                        ]);
                      } catch (e: any) {
                        setMessages((m) => [
                          ...m,
                          {
                            role: "assistant",
                            content:
                              e?.message || "I could not create the segment. Please try again or choose a different name.",
                            agent: "segmentation",
                          },
                        ]);
                      }
                    }}
                  >
                    Add segment
                  </button>
                </div>
              )}


            </div>
          </div>
        ))}
        {/* no thinking indicator per user request; the assistant answer will appear when ready */}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-coffee-border bg-panel-surface p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 items-end"
        >
          <textarea
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a segment, draft copy, or campaign help..."
            rows={3}
            className="flex-1 resize-none rounded-[14px] border border-coffee-border bg-transparent px-4 py-3 text-sm text-coffee-text placeholder:text-coffee-muted transition-colors focus:border-coffee-border focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-full bg-coffee-highlight text-coffee-cream disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
