import clsx, { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const AGENT_COLORS: Record<string, string> = {
  data: "bg-panel-surface text-coffee-text border border-coffee-border",
  segmentation: "bg-panel-surface text-coffee-text border border-coffee-border",
  content: "bg-panel-surface text-coffee-text border border-coffee-border",
  campaign: "bg-panel-surface text-coffee-text border border-coffee-border",
  insights: "bg-panel-surface text-coffee-text border border-coffee-border",
  supervisor: "bg-panel-surface text-coffee-text border border-coffee-border",
};

export const CHANNEL_DETAILS: Record<string, { label: string; className: string }> = {
  whatsapp: {
    label: "WhatsApp",
    className: "bg-panel-surface text-coffee-text border border-coffee-border",
  },
  sms: {
    label: "SMS",
    className: "bg-panel-surface text-coffee-text border border-coffee-border",
  },
  email: {
    label: "Email",
    className: "bg-panel-surface text-coffee-text border border-coffee-border",
  },
  rcs: {
    label: "RCS",
    className: "bg-panel-surface text-coffee-text border border-coffee-border",
  },
};

export function sanitizeAssistantText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`/g, "")
    .replace(/^[•*-]\s+/gm, "- ")
    .replace(/🛍|🎁|📦|🎒/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
