"use client";

import type { ReactNode } from "react";

export type AdminCockpitTab = "overview" | "actions" | "support" | "users" | "billing";

type TabConfig = {
  id: AdminCockpitTab;
  label: string;
  badge?: number;
};

type TabBarProps = {
  tabs: TabConfig[];
  active: AdminCockpitTab;
  onChange: (tab: AdminCockpitTab) => void;
};

export function AdminCockpitTabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <nav
      className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 border-b border-ns-border bg-ns-background/95 px-1 py-3 backdrop-blur-sm"
      aria-label="Sections admin"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-ns-primary text-black shadow-sm"
                : "border border-ns-alternate bg-white text-ns-secondary hover:border-ns-primary hover:text-ns-hero"
            }`}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 ? (
              <span
                className={`inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  isActive ? "bg-black/15 text-black" : "bg-rose-100 text-rose-800"
                }`}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

type SectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function AdminCockpitSection({ title, subtitle, children, className = "" }: SectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-ns-primary">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-ns-secondary">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

type KpiGroupProps = {
  title: string;
  children: ReactNode;
  columns?: "auto" | "3" | "6";
};

export function AdminKpiGroup({ title, children, columns = "auto" }: KpiGroupProps) {
  const gridClass =
    columns === "6"
      ? "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      : columns === "3"
        ? "grid grid-cols-2 gap-2 sm:grid-cols-3"
        : "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-ns-primary">{title}</h3>
      <div className={gridClass}>{children}</div>
    </div>
  );
}

type PanelShellProps = {
  children: ReactNode;
  embedded?: boolean;
  tone?: "default" | "emerald" | "slate" | "neutral";
};

const PANEL_TONE: Record<NonNullable<PanelShellProps["tone"]>, string> = {
  default: "border-ns-border bg-white",
  emerald: "border-emerald-200 bg-emerald-50/40",
  slate: "border-slate-200 bg-slate-50/80",
  neutral: "border-ns-border bg-ns-surface",
};

export function AdminPanelShell({
  children,
  embedded = false,
  tone = "default",
}: PanelShellProps) {
  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm ${PANEL_TONE[tone]} ${embedded ? "" : "mt-10"}`}
    >
      {children}
    </div>
  );
}
