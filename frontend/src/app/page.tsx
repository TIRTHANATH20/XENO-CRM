"use client";

import { useState, useEffect, useCallback } from "react";
import { StatsGrid } from "@/components/StatsGrid";
import { CampaignCard } from "@/components/CampaignCard";
import { LoadingRing } from "@/components/LoadingRing";
import { api, type DashboardStats, type Campaign, type Segment } from "@/lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardResult, campaignsResult, segmentsResult] = await Promise.allSettled([
        api.getDashboard(),
        api.getCampaigns(),
        api.getSegments(),
      ]);

      if (dashboardResult.status === "fulfilled") {
        setStats(dashboardResult.value);
      }

      if (campaignsResult.status === "fulfilled") {
        setCampaigns(campaignsResult.value);
      }

      if (segmentsResult.status === "fulfilled") {
        setSegments(segmentsResult.value);
      }
    } catch (error) {
      console.warn("Dashboard refresh failed", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-10 h-full">
        <LoadingRing label="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-6 lg:grid-cols-[1.4fr_0.95fr] min-h-0 h-full">
      <div className="glass-card h-full flex flex-col overflow-hidden">
        <div className="p-6 border-b border-coffee-border">
          <h2 className="text-3xl font-bold text-coffee-text">Dashboard</h2>
          <p className="mt-2 text-sm text-coffee-muted">Real-time performance metrics and insights</p>
        </div>
        <div className="flex-1 panel-scroll p-6 space-y-6 overflow-y-auto">
          {stats ? (
            <>
              <StatsGrid data={stats} />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-coffee-text">Key Metrics</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[12px] border border-coffee-border bg-surface-soft p-4 hover:border-coffee-highlight transition-colors">
                    <p className="text-xs font-medium uppercase tracking-wide text-coffee-muted">Email Open Rate</p>
                    <p className="mt-3 text-2xl font-bold text-coffee-text">{stats.open_rate}%</p>
                    <p className="mt-1 text-xs text-coffee-muted">+2.4% vs last week</p>
                  </div>
                  <div className="rounded-[12px] border border-coffee-border bg-surface-soft p-4 hover:border-coffee-highlight transition-colors">
                    <p className="text-xs font-medium uppercase tracking-wide text-coffee-muted">Click-Through Rate</p>
                    <p className="mt-3 text-2xl font-bold text-coffee-text">{stats.click_rate}%</p>
                    <p className="mt-1 text-xs text-coffee-muted">+1.1% vs last week</p>
                  </div>
                  <div className="rounded-[12px] border border-coffee-border bg-surface-soft p-4 hover:border-coffee-highlight transition-colors">
                    <p className="text-xs font-medium uppercase tracking-wide text-coffee-muted">Conversion Rate</p>
                    <p className="mt-3 text-2xl font-bold text-coffee-text">{stats.conversion_rate}%</p>
                    <p className="mt-1 text-xs text-coffee-muted">+0.8% vs last week</p>
                  </div>
                  <div className="rounded-[12px] border border-coffee-border bg-surface-soft p-4 hover:border-coffee-highlight transition-colors">
                    <p className="text-xs font-medium uppercase tracking-wide text-coffee-muted">Delivery Rate</p>
                    <p className="mt-3 text-2xl font-bold text-coffee-text">{stats.delivery_rate}%</p>
                    <p className="mt-1 text-xs text-coffee-muted">Stable</p>
                  </div>
                </div>
              </div>

            </>
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-coffee-muted">Start the CRM backend to see stats.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 min-h-0 h-full">
        <div className="glass-card flex flex-col overflow-hidden flex-1 min-h-0">
          <div className="p-6 border-b border-coffee-border">
            <h3 className="text-lg font-bold text-coffee-text">Recent Campaigns</h3>
            <p className="mt-1 text-xs text-coffee-muted">Latest sends and performance</p>
          </div>
          <div className="flex-1 panel-scroll p-4 space-y-2 overflow-y-auto">
            {campaigns.length === 0 ? (
              <p className="text-sm text-coffee-muted p-4">No campaigns yet</p>
            ) : (
              campaigns.slice(0, 5).map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))
            )}
          </div>
        </div>

        <div className="glass-card flex flex-col overflow-hidden flex-1 min-h-0">
          <div className="p-6 border-b border-coffee-border">
            <h3 className="text-lg font-bold text-coffee-text">Active Segments</h3>
            <p className="mt-1 text-xs text-coffee-muted">Top audience groups</p>
          </div>
          <div className="flex-1 panel-scroll p-4 space-y-2 overflow-y-auto">
            {segments.length === 0 ? (
              <p className="text-xs text-coffee-muted p-4">Create a segment to get started</p>
            ) : (
              segments.slice(0, 4).map((segment) => (
                <div key={segment.id} className="rounded-[10px] border border-coffee-border bg-surface-soft p-3 hover:border-coffee-highlight transition-colors">
                  <p className="text-xs font-semibold text-coffee-text truncate">{segment.name}</p>
                  <p className="text-[11px] text-coffee-muted mt-1">{segment.customer_count.toLocaleString()} users</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
