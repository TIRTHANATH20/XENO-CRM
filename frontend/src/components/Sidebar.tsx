"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Layers, Send, Wand2, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: BarChart3, subtitle: "Overview" },
  { href: "/customers", label: "Customers", icon: Users, subtitle: "Profiles" },
  { href: "/segments", label: "Segments", icon: Layers, subtitle: "Audience" },
  { href: "/campaigns", label: "Campaigns", icon: Send, subtitle: "Messaging" },
  { href: "/ai-assistant", label: "Assistant", icon: Wand2, subtitle: "AI Chat" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="glass-card h-full w-full max-w-[19rem] shrink-0 flex flex-col overflow-hidden border border-coffee-border xl:w-[18.5rem] rounded-none border-0 border-r rounded-r-[20px]">
      <div className="border-b border-coffee-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-coffee-highlight text-coffee-cream shadow-soft">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-coffee-text tracking-tight">Coffee House</h1>
            <p className="text-xs text-coffee-muted font-medium">AI CRM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 p-4">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-sm font-medium transition-all duration-200 group",
                active
                  ? "bg-coffee-surface/80 text-coffee-text border border-coffee-border"
                  : "text-coffee-muted hover:bg-surface-soft hover:text-coffee-text"
              )}
            >
              <span className={cn(
                "flex h-9 w-9 items-center justify-center rounded-[10px] border transition-all duration-200",
                active
                  ? "bg-coffee-highlight text-coffee-cream border border-coffee-border"
                  : "bg-surface-soft text-coffee-muted border-coffee-border group-hover:text-coffee-text"
              )}>
                <item.icon className="h-4 w-4" />
              </span>
              <div className="flex flex-col items-start">
                <span className="font-semibold">{item.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-coffee-muted">
                  {item.subtitle}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-coffee-border p-4">
        <div className="rounded-[12px] bg-coffee-surface/70 border border-coffee-border p-4">
          <p className="text-xs font-semibold text-coffee-text mb-2">AI-Powered</p>
          <p className="text-xs text-coffee-muted leading-relaxed">Next-gen CRM with intelligent segmentation and campaign optimization.</p>
        </div>
      </div>
    </aside>
  );
}
