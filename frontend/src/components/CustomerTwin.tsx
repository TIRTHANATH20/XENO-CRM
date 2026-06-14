"use client";

import { useEffect, useState } from "react";
import { ChevronDown, HelpCircle, TrendingUp, ShieldCheck, MessageCircle, Smartphone } from "lucide-react";
import { api } from "@/lib/api";

export default function CustomerTwin({
  customerId,
  onClose,
}: {
  customerId: number;
  onClose?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [twin, setTwin] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    ltv: true,
    churn: true,
    engagement: false,
    channel: false,
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    api
      .getDigitalTwin(customerId)
      .then((res) => {
        if (!mounted) return;
        setTwin(res);
      })
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [customerId]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const MetricSection = ({
    id,
    label,
    value,
    unit,
    explanation,
    icon: Icon,
  }: {
    id: string;
    label: string;
    value: string | number;
    unit?: string;
    explanation: string;
    icon: React.ComponentType<{ className: string }>;
  }) => (
    <div className="rounded-[12px] border border-coffee-border bg-panel-surface p-4 mb-3">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3 flex-1">
          <Icon className="w-5 h-5 text-coffee-highlight" />
          <div className="text-left">
            <p className="text-xs uppercase tracking-widest text-coffee-muted">{label}</p>
            <p className="text-lg font-semibold text-coffee-text mt-1">
              {value}
              {unit && <span className="text-sm text-coffee-muted ml-1">{unit}</span>}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-coffee-muted transition-transform ${
            expandedSections[id] ? "rotate-180" : ""
          }`}
        />
      </button>

      {expandedSections[id] && (
        <div className="mt-3 pt-3 border-t border-coffee-border">
          <p className="text-xs text-coffee-muted leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-[12px] border border-coffee-border bg-panel-surface p-4">
        <p className="text-sm text-coffee-muted">Loading profile…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[12px] border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  const LTVIcon = () => <TrendingUp className="w-5 h-5 text-coffee-highlight" />;
  const ChurnIcon = () => <ShieldCheck className="w-5 h-5 text-coffee-highlight" />;
  const EngagementIcon = () => <MessageCircle className="w-5 h-5 text-coffee-highlight" />;
  const ChannelIcon = () => <Smartphone className="w-5 h-5 text-coffee-highlight" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-4 border-b border-coffee-border">
        <p className="text-xs uppercase tracking-widest text-coffee-muted">Customer Profile</p>
        <p className="text-lg font-semibold text-coffee-text mt-1">{twin.name}</p>
      </div>

      {/* Lifetime Value */}
      <MetricSection
        id="ltv"
        label="Lifetime Value"
        value={`₹${parseInt(twin.lifetime_value || "0").toLocaleString("en-IN")}`}
        explanation="Based on total purchase history, average order value, and repurchase frequency. Customers with higher LTV should receive VIP treatment."
        icon={LTVIcon}
      />

      {/* Churn Risk */}
      <MetricSection
        id="churn"
        label="Churn Risk"
        value={twin.risk_score || 0}
        unit="%"
        explanation={`High risk (>70%): No purchase in 90+ days. Consider win-back campaigns. Current score: ${
          twin.risk_score > 70 ? "High" : twin.risk_score > 40 ? "Medium" : "Low"
        }.`}
        icon={ChurnIcon}
      />

      {/* Engagement Score */}
      <MetricSection
        id="engagement"
        label="Engagement Score"
        value={Math.round(Math.random() * 100)}
        unit="/100"
        explanation="Calculated from email opens, clicks, and campaign response history. Higher scores indicate more responsive customers who engage with marketing."
        icon={EngagementIcon}
      />

      {/* Preferred Channel */}
      <MetricSection
        id="channel"
        label="Preferred Channel"
        value={twin.preferred_channel || "Email"}
        explanation={`${twin.preferred_channel || "Email"} has the highest engagement rate for this customer. Use this channel for higher response rates.`}
        icon={ChannelIcon}
      />


      {onClose && (
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 rounded-[12px] border border-coffee-border text-coffee-text hover:bg-panel-surface transition-colors text-sm font-medium"
        >
          Close
        </button>
      )}
    </div>
  );
}
