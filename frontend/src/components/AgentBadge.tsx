import React from 'react';

const AGENT_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  content: 'Content Specialist',
  segmentation: 'Segmentation',
  campaign: 'Campaigns',
  insights: 'Insights'
};

export const AgentBadge: React.FC<{ agent?: string }> = ({ agent }) => {
  const safeAgent = agent || 'supervisor';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-coffee-dark text-coffee-light border border-coffee-muted/20">
      via {AGENT_LABELS[safeAgent] || String(safeAgent).replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
};
export default AgentBadge;
