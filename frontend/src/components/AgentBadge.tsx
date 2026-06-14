import { cn, AGENT_COLORS } from "@/lib/utils";

const AGENT_LABELS: Record<string, string> = {
  supervisor: "Supervisor",
  segmentation: "Segmentation",
  content: "Content",
  campaign: "Campaign",
  insights: "Insights",
  data: "Data",
};

function labelForAgent(agent: string) {
  return AGENT_LABELS[agent] || agent.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AgentBadge({ agent }: { agent: string }) {
  const color = AGENT_COLORS[agent] || AGENT_COLORS.supervisor;
  return (
    <span className={cn("agent-badge border", color)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-soft" />
      {labelForAgent(agent)} agent
    </span>
  );
}
