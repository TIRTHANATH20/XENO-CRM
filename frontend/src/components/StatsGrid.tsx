"use client";

import { Users, ShoppingBag, IndianRupee, Send, TrendingUp, MousePointer, Eye, Target } from "lucide-react";
import type { DashboardStats } from "@/lib/api";

const compactCurrency = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const stats = (d: DashboardStats) => [
  { label: "Shoppers", value: d.total_customers.toLocaleString("en-IN"), icon: Users, color: "text-coffee-muted" },
  { label: "Orders", value: d.total_orders.toLocaleString("en-IN"), icon: ShoppingBag, color: "text-coffee-muted" },
  { label: "Revenue", value: `₹${compactCurrency.format(d.total_revenue)}`, icon: IndianRupee, color: "text-coffee-muted" },
  { label: "Live campaigns", value: String(d.active_campaigns), icon: Send, color: "text-coffee-muted" },
];

export function StatsGrid({ data }: { data: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats(data).map((s) => (
        <div key={s.label} className="stat-card animate-fade-in flex min-h-[96px] w-full flex-col justify-between overflow-hidden rounded-[20px] border border-coffee-border bg-panel-surface p-3">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-[16px] border border-coffee-border bg-coffee-card ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <span className="block max-w-[calc(100%-3rem)] overflow-hidden text-right text-[9px] uppercase tracking-[0.18em] text-coffee-muted break-words">
              {s.label}
            </span>
          </div>
          <div>
            <p className="mt-3 break-words text-xl font-semibold text-coffee-text sm:text-[1.7rem] leading-none">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
