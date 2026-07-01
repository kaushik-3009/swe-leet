"use client";

import { useEffect, useState } from "react";
import { StudyEntry, getEntries, deleteEntry } from "@/lib/storage";

interface Props {
  refreshKey: number;
}

export default function EntryList({ refreshKey }: Props) {
  const [entries, setEntries] = useState<StudyEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEntries(getEntries());
    setMounted(true);
  }, [refreshKey]);

  function handleDelete(id: string) {
    deleteEntry(id);
    setEntries(getEntries());
  }

  if (!mounted) {
    return (
      <div className="rounded-xl h-64 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
    );
  }

  return (
    <div
      className="rounded-xl"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        padding: "24px",
        boxShadow: "var(--shadow-sm)",
        minHeight: "300px",
      }}
    >
      <h2
        className="text-base font-semibold mb-5 flex items-center gap-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
      >
        <span style={{ color: "var(--accent)" }}>·</span> Recent Sessions
      </h2>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 gap-3.5">
          <div
            className="w-[52px] h-[52px] rounded-xl flex items-center justify-center"
            style={{
              background: "var(--card-elevated)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-tertiary)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <div className="font-semibold text-[15px]" style={{ color: "var(--text-primary)" }}>
            No entries yet
          </div>
          <div className="text-[13px] max-w-[320px]" style={{ color: "var(--text-tertiary)" }}>
            Log your first study session on the left to start building your streak.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(
            entries.reduce<Record<string, StudyEntry[]>>((acc, entry) => {
              (acc[entry.date] = acc[entry.date] || []).push(entry);
              return acc;
            }, {})
          )
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dayEntries]) => (
            <div key={date}>
              <div
                className="text-[11px] tracking-wide uppercase mb-2 font-medium"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
              >
                {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="space-y-2">
                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-3 rounded-lg p-3 group transition-colors"
                    style={{ background: "var(--card-elevated)" }}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                        {entry.topic}
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                        {entry.resource}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-all text-xs shrink-0 cursor-pointer px-1"
                      style={{ color: "var(--text-tertiary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
