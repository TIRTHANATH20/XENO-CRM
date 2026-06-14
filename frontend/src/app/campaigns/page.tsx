"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { LoadingRing } from "@/components/LoadingRing";
import { CampaignCard } from "@/components/CampaignCard";
import { api, type Campaign, type Segment } from "@/lib/api";
import { sanitizeAssistantText } from "@/lib/utils";
import { Send, Plus } from "lucide-react";

function parseAIResponse(input: string) {
  const cleaned = sanitizeAssistantText(input).trim();
  const insightMatch = cleaned.match(/^(?:Insight:)?\s*([^\n][^\n]*)(?:\n\n|\n|$)/i);
  const messageLabelMatch = cleaned.match(/Message:\s*([\s\S]+)/i);

  if (messageLabelMatch) {
    return {
      rationale: insightMatch?.[1]?.trim() ?? null,
      message: messageLabelMatch[1].trim(),
    };
  }

  const parts = cleaned.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      rationale: parts[0],
      message: parts.slice(1).join("\n\n"),
    };
  }

  return { rationale: null, message: cleaned };
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignChannel, setCampaignChannel] = useState("email");
  const [campaignSegmentId, setCampaignSegmentId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `campaigns-${Date.now()}`));
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsResult, segmentsResult] = await Promise.allSettled([
        api.getCampaigns(),
        api.getSegments(),
      ]);

      if (campaignsResult.status === "fulfilled") {
        setCampaigns(campaignsResult.value);
      }

      if (segmentsResult.status === "fulfilled") {
        setSegments(segmentsResult.value);
        if (segmentsResult.value.length > 0 && !campaignSegmentId) {
          setCampaignSegmentId(segmentsResult.value[0].id);
        }
      }
    } catch (error) {
      console.warn("Failed to load campaigns", error);
    } finally {
      setLoading(false);
    }
  }, [campaignSegmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteCampaign = useCallback(
    async (id: number) => {
      if (!confirm("Delete this campaign? This cannot be undone.")) return;
      try {
        await api.deleteCampaign(id);
        await loadData();
      } catch (err) {
        console.error("Failed to delete campaign", err);
        setError(err instanceof Error ? err.message : "Failed to delete campaign");
      }
    },
    [loadData]
  );

  const handleCreateCampaign = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!campaignName.trim() || !campaignDescription.trim() || !campaignMessage.trim() || !campaignSegmentId) {
        setError("Please fill in all fields and generate the campaign copy.");
        return;
      }

      setCreating(true);
      setError(null);

      try {
        await api.createCampaign({
          name: campaignName.trim(),
          segment_id: campaignSegmentId,
          channel: campaignChannel,
          message_template: campaignMessage.trim(),
          status: "draft",
        });

        setCampaignName("");
        setCampaignDescription("");
        setCampaignMessage("");
        setShowCreateForm(false);
        await loadData();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to create campaign");
      } finally {
        setCreating(false);
      }
    },
    [campaignName, campaignDescription, campaignMessage, campaignSegmentId, campaignChannel, loadData]
  );

  const handleGenerateCopy = useCallback(async () => {
    if (!campaignSegmentId) {
      setAiError("Select a segment before generating AI copy.");
      return;
    }

    const segment = segments.find((segment) => segment.id === campaignSegmentId);
    const channelName = campaignChannel === "email" ? "email" : campaignChannel === "sms" ? "SMS" : campaignChannel === "whatsapp" ? "WhatsApp" : campaignChannel.toUpperCase();
    const prompt = `You are writing a premium ${channelName} campaign for Coffee House.
Use the audience segment: ${segment?.name ?? "selected audience"}.
${segment?.description ? `Segment details: ${segment.description}` : "Use the segment definition to make this feel relevant and specific."}
Campaign brief: ${campaignDescription}
Write the final message only, warm and coffee-first, using {{name}} once and including a clear call to action.`;

    setAiGenerating(true);

    try {
      const res = await api.chat(prompt, threadId, { stats: null, segments, campaigns, messages: [] });
      const parsed = parseAIResponse(res.response);
      setCampaignMessage(parsed.message);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI generation failed. Try again later.");
    } finally {
      setAiGenerating(false);
    }
  }, [campaignChannel, campaignDescription, campaignSegmentId, campaigns, segments, threadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 h-full">
        <LoadingRing label="Loading campaigns..." />
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-semibold text-coffee-text">Campaigns</h2>
              <p className="text-sm text-coffee-muted mt-1">Create campaigns, preview message drafts, and tap the AI assistant.</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-coffee-highlight hover:bg-coffee-highlight-strong text-coffee-cream transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>

          {showCreateForm && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-coffee-text mb-4">New Campaign</h3>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-coffee-text mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Spring Promo"
                    className="w-full px-4 py-2 rounded-[12px] border border-coffee-border bg-panel-surface text-coffee-text placeholder-coffee-muted focus:outline-none focus:ring-2 focus:ring-coffee-highlight"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-coffee-text mb-2">Segment</label>
                    <select
                      value={campaignSegmentId || ""}
                      onChange={(e) => setCampaignSegmentId(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-[12px] border border-coffee-border bg-panel-surface text-coffee-text focus:outline-none focus:ring-2 focus:ring-coffee-highlight"
                    >
                      {segments.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.customer_count})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-coffee-text mb-2">Channel</label>
                    <select
                      value={campaignChannel}
                      onChange={(e) => setCampaignChannel(e.target.value)}
                      className="w-full px-4 py-2 rounded-[12px] border border-coffee-border bg-panel-surface text-coffee-text focus:outline-none focus:ring-2 focus:ring-coffee-highlight"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="rcs">RCS</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <label className="block text-sm font-medium text-coffee-text">Campaign brief</label>
                    <button
                      type="button"
                      onClick={handleGenerateCopy}
                      disabled={aiGenerating || !campaignDescription.trim() || !campaignSegmentId}
                      className="rounded-full border border-coffee-border bg-panel-surface px-3 py-1.5 text-xs font-semibold text-coffee-text transition hover:border-coffee-highlight disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiGenerating ? "Generating…" : "Generate with AI"}
                    </button>
                  </div>
                  <label className="block text-sm font-medium text-coffee-text mb-2">Campaign brief</label>
                  <textarea
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    placeholder="e.g. Need to send a 50% off welcome offer to new subscribers"
                    rows={3}
                    className="w-full px-4 py-2 rounded-[12px] border border-coffee-border bg-panel-surface text-coffee-text placeholder-coffee-muted focus:outline-none focus:ring-2 focus:ring-coffee-highlight"
                  />
                  <p className="mt-2 text-xs text-coffee-muted">Describe the offer, audience, and tone. Click Generate with AI to create the message.</p>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-coffee-text mb-2">Generated message</label>
                    <textarea
                      value={campaignMessage}
                      onChange={(e) => setCampaignMessage(e.target.value)}
                      placeholder="Generated campaign copy will appear here"
                      rows={10}
                      className="w-full min-h-[260px] px-4 py-3 rounded-[12px] border border-coffee-border bg-panel-surface text-coffee-text placeholder-coffee-muted focus:outline-none focus:ring-2 focus:ring-coffee-highlight"
                    />
                  </div>
                  {aiError && <p className="text-sm text-rose-300 mt-2">{aiError}</p>}
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 rounded-[12px] border border-coffee-border text-coffee-text hover:bg-panel-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-coffee-highlight hover:bg-coffee-highlight-strong text-coffee-cream transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {campaigns.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-coffee-muted">No campaigns yet. Create your first one.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} onDelete={handleDeleteCampaign} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
