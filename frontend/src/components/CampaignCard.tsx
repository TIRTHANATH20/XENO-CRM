"use client";

import { CHANNEL_DETAILS, cn } from "@/lib/utils";
import { Smartphone, Mail, MessageSquare, Globe, Trash } from "lucide-react";
import type { Campaign } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-panel-surface text-coffee-muted",
  scheduled: "bg-panel-surface text-coffee-muted",
  sending: "bg-panel-surface text-coffee-muted animate-pulse",
  completed: "bg-panel-surface text-coffee-muted",
  failed: "bg-panel-surface text-coffee-muted",
};

export function CampaignCard({
  campaign,
  onStatClick,
  onDelete,
}: {
  campaign: Campaign;
  onStatClick?: (label: string) => void;
  onDelete?: (id: number) => void;
}) {
  const funnel = [
    { label: "Sent", value: campaign.sent_count },
    { label: "Delivered", value: campaign.delivered_count },
    { label: "Opened", value: campaign.opened_count },
    { label: "Clicked", value: campaign.clicked_count },
    { label: "Converted", value: campaign.converted_count },
  ];

  const ch = (campaign.channel || "").toLowerCase();
  const ChannelIcon = ch === "whatsapp" ? MessageSquare : ch === "sms" ? Smartphone : ch === "email" ? Mail : Globe;
  const channelMeta = CHANNEL_DETAILS[ch] || { label: campaign.channel || "Unknown", className: "bg-panel-surface text-coffee-text border border-coffee-border" };

  const preview = campaign.message_template.length > 100 ? `${campaign.message_template.slice(0, 100)}…` : campaign.message_template;

  return (
    <div className="glass-card min-w-0 overflow-hidden border border-coffee-border p-4 transition-transform duration-200 hover:border-coffee-border">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold", channelMeta.className)}>
                <ChannelIcon className="w-3.5 h-3.5" />
                {channelMeta.label}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  STATUS_STYLES[campaign.status] ?? "bg-panel-surface text-coffee-text border border-coffee-border"
                )}
              >
                {campaign.status}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-coffee-text break-words">{campaign.name}</h3>
            <p className="text-xs text-coffee-muted leading-5 break-words line-clamp-2">{preview.replace(/🛍|🎁/g, "")}</p>
          </div>

          <div className="text-right text-[10px] text-coffee-muted whitespace-nowrap shrink-0 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p>{new Date(campaign.created_at).toLocaleDateString()}</p>
                <p className="mt-1">{campaign.channel || "N/A"}</p>
              </div>
              {onDelete && (
                <button
                  aria-label="Delete campaign"
                  onClick={() => onDelete(campaign.id)}
                  className="p-1 rounded-md hover:bg-red-500/10"
                >
                  <Trash className="w-4 h-4 text-rose-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {funnel.slice(0, 4).map((f) => (
            <div
              key={f.label}
              className="rounded-[18px] border border-coffee-border bg-panel-surface px-2.5 py-3 text-center"
            >
              <p className="text-lg font-semibold text-coffee-text">{f.value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-coffee-muted">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
