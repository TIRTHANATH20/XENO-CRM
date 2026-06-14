"use client";

import { Fragment, useState, useCallback, useRef, useEffect, FormEvent } from "react";
import { LoadingRing } from "@/components/LoadingRing";
import { api, type ChatContext, type DashboardStats, type Segment, type Campaign } from "@/lib/api";
import { sanitizeAssistantText } from "@/lib/utils";
import { Send } from "lucide-react";

const STORAGE_KEY = "xeno_chat_messages";
const THREAD_KEY = "xeno_chat_thread_id";
const DEFAULT_ASSISTANT_MESSAGE = [
  {
    role: "assistant" as const,
    content: "Hello! I'm your AI assistant. I can help with segments, campaigns, and performance.",
  },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; agent?: string }>>(
    DEFAULT_ASSISTANT_MESSAGE
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [threadId, setThreadId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // On mount, hydrate messages and threadId from sessionStorage to avoid
  // SSR/client hydration mismatches (initial render uses DEFAULT_ASSISTANT_MESSAGE).
  useEffect(() => {
    try {
      // read from sessionStorage first, then fallback to localStorage, then legacy keys
      const raw =
        window.sessionStorage.getItem(STORAGE_KEY) ||
        window.sessionStorage.getItem("xeno_ai_assistant_messages") ||
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem("xeno_ai_assistant_messages");
      const parsed = raw ? (JSON.parse(raw) as Array<{ role: "user" | "assistant"; content: string; agent?: string }>) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      }
    } catch {
      // ignore parse errors
    }

    try {
      const storedThread =
        window.sessionStorage.getItem(THREAD_KEY) ||
        window.sessionStorage.getItem("xeno_ai_assistant_thread_id") ||
        window.localStorage.getItem(THREAD_KEY) ||
        window.localStorage.getItem("xeno_ai_assistant_thread_id");
      if (storedThread) {
        setThreadId(storedThread);
      } else {
        setThreadId(`ai-${Date.now()}`);
      }
    } catch {
      setThreadId(`ai-${Date.now()}`);
    }

    setHydrated(true);

    // Sync across tabs/windows via storage events
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === STORAGE_KEY || e.key === "xeno_ai_assistant_messages") {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      // Write to sessionStorage and localStorage as a fallback
      const json = JSON.stringify(messages);
      window.sessionStorage.setItem(STORAGE_KEY, json);
      try {
        window.sessionStorage.setItem("xeno_ai_assistant_messages", json);
      } catch {}
      try {
        window.localStorage.setItem(STORAGE_KEY, json);
        window.localStorage.setItem("xeno_ai_assistant_messages", json);
      } catch {}
    } catch {
      // ignore storage errors
    }
  }, [messages, hydrated]);

  useEffect(() => {
    if (!threadId) return;
    try {
      window.sessionStorage.setItem(THREAD_KEY, threadId);
      window.localStorage.setItem(THREAD_KEY, threadId);
      try {
        window.sessionStorage.setItem("xeno_ai_assistant_thread_id", threadId);
      } catch {}
      try {
        window.localStorage.setItem("xeno_ai_assistant_thread_id", threadId);
      } catch {}
    } catch {
      // ignore storage errors
    }
  }, [threadId]);

  const renderMessageContent = useCallback((content: string) => {
    return content.split(/\n{2,}/).map((paragraph, idx) => {
      const lines = paragraph.split("\n");
      return (
        <p key={idx} className={`text-sm leading-relaxed ${idx > 0 ? "mt-3" : ""}`}>
          {lines.map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </p>
      );
    });
  }, []);

  const loadContext = useCallback(async () => {
    try {
      const [statsResult, segmentsResult, campaignsResult] = await Promise.allSettled([
        api.getDashboard(),
        api.getSegments(),
        api.getCampaigns(),
      ]);

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      }
      if (segmentsResult.status === "fulfilled") {
        setSegments(segmentsResult.value);
      }
      if (campaignsResult.status === "fulfilled") {
        setCampaigns(campaignsResult.value);
      }
    } catch (err) {
      console.warn("Failed to load context", err);
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const handleSendMessage = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!input.trim() || loading) return;

      const userMessage = input.trim();
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      setLoading(true);
      setError(null);

      try {
        const conversation = [...messages, { role: "user" as const, content: userMessage }];
        const context: ChatContext = {
          stats,
          segments,
          campaigns,
          messages: conversation.map((m) => ({ role: m.role, content: m.content })),
        };

        const response = await api.chat(userMessage, threadId, context);
        const sanitized = sanitizeAssistantText(response.response);

        setMessages((prev) => [...prev, { role: "assistant", content: sanitized, agent: response.agent }]);

        if (response.new_segment) {
          try {
            const created = await api.createSegment(response.new_segment);
            setSegments((prev) => [created, ...prev]);
            try {
              window.dispatchEvent(new Event("segments:updated"));
            } catch {}
            const successMsg = `✓ Created new segment: "${response.new_segment.name}" with ${response.new_segment.customer_count} customers.`;
            setMessages((prev) => [...prev, { role: "assistant", content: successMsg, agent: response.agent }]);
          } catch (segmentErr) {
            console.warn("Segment creation failed", segmentErr);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to get response from AI";
        setError(errorMessage);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, I encountered an error: ${errorMessage}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, stats, segments, campaigns, threadId]
  );

  return (
    <div className="flex flex-col gap-4 h-full p-6">
      <div className="glass-card flex flex-col overflow-hidden flex-1 min-h-0">
        <div className="p-6 border-b border-coffee-border flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-coffee-text">AI Assistant</h1>
            <p className="mt-2 text-sm text-coffee-muted">Ask anything about customers, segments, campaigns, or performance.</p>
          </div>
        </div>

        <div className="flex-1 panel-scroll overflow-y-auto p-6 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-[14px] px-4 py-3 max-w-xs lg:max-w-md xl:max-w-lg ${
                  message.role === "user"
                    ? "bg-coffee-highlight text-coffee-cream shadow-soft"
                    : "bg-panel-surface border border-coffee-border text-coffee-text"
                }`}
              >
                <div className="break-words whitespace-pre-wrap text-sm leading-relaxed">
                  {renderMessageContent(message.content)}
                </div>
                {message.agent && message.role === "assistant" && (
                  <p className="text-xs mt-2 opacity-70 font-medium">
                    via {message.agent === "supervisor" ? "Supervisor" : message.agent.charAt(0).toUpperCase() + message.agent.slice(1)}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-[14px] px-4 py-3 bg-surface-soft border border-coffee-border">
                <LoadingRing label="AI is thinking..." />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="rounded-[14px] px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-coffee-border p-6">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 rounded-[12px] border border-coffee-border bg-panel-surface text-coffee-text placeholder-coffee-muted/60 focus:outline-none focus:ring-2 focus:ring-coffee-highlight/60 focus:border-coffee-highlight"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center justify-center h-11 w-11 rounded-[12px] bg-coffee-highlight text-coffee-cream hover:bg-coffee-highlight-strong hover:shadow-soft transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
