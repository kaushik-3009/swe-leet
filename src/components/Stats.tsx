"use client";

import { useEffect, useState } from "react";
import { getTotalEntries, getStudyDays, getTopicsStudied } from "@/lib/storage";

interface Props {
  refreshKey: number;
}

export default function Stats({ refreshKey }: Props) {
  const [stats, setStats] = useState({ total: 0, days: 0, topics: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStats({
      total: getTotalEntries(),
      days: getStudyDays(),
      topics: getTopicsStudied().length,
    });
    setMounted(true);
  }, [refreshKey]);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl h-32 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Entries",
      value: stats.total,
      color: "var(--stat-teal)",
      bg: "var(--stat-teal-bg)",
      sub: stats.total === 0 ? "Log your first session below" : `${stats.total} sessions logged`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      ),
    },
    {
      label: "Study Days",
      value: stats.days,
      color: "var(--stat-blue)",
      bg: "var(--stat-blue-bg)",
      sub: stats.days === 0 ? "No active streak yet" : `${stats.days} unique days`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      ),
    },
    {
      label: "Unique Topics",
      value: stats.topics,
      color: "var(--stat-amber)",
      bg: "var(--stat-amber-bg)",
      sub: stats.topics === 0 ? "Across all sessions" : `${stats.topics} topics covered`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.24L4 3a1 1 0 00-1 1l.24 5.59a2 2 0 00.58 1.41l9.59 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative rounded-xl overflow-hidden"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[2px] opacity-80"
            style={{ background: `linear-gradient(90deg, ${card.color}, transparent 70%)` }}
          />
          <div
            className="absolute top-2.5 right-2.5 w-3.5 h-3.5 opacity-50"
            style={{ borderTop: "1px solid var(--border-strong)", borderRight: "1px solid var(--border-strong)" }}
          />
          <div className="p-5 pb-4">
            <div className="flex justify-between items-start mb-4">
              <div
                className="text-[11px] tracking-wider uppercase"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
              >
                {card.label}
              </div>
              <div
                className="w-[30px] h-[30px] rounded-md flex items-center justify-center"
                style={{ background: card.bg, color: card.color }}
              >
                <div className="w-4 h-4">{card.icon}</div>
              </div>
            </div>
            <div
              className="text-[32px] font-semibold leading-none mb-1.5 tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {card.value}
            </div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {card.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
