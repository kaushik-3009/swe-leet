"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserEntries, deleteEntry } from "@/lib/firestore";
import type { StudyEntry } from "@/lib/firestore";

interface Props {
  refreshKey: number;
  userId: string;
  showViewAll?: boolean;
  scrollable?: boolean;
}

export default function EntryList({
  refreshKey,
  userId,
  showViewAll,
  scrollable = true,
}: Props) {
  const [entries, setEntries] = useState<StudyEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function load() {
      const e = await getUserEntries(userId);
      setEntries(e);
      setMounted(true);
    }
    load();
  }, [refreshKey, userId]);

  async function handleDelete(id: string) {
    await deleteEntry(id);
    const e = await getUserEntries(userId);
    setEntries(e);
  }

  if (!mounted) {
    return (
      <div
        className="rounded-xl h-64 animate-pulse"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      />
    );
  }

  const grouped = entries.reduce<Record<string, StudyEntry[]>>((acc, entry) => {
    (acc[entry.date] = acc[entry.date] || []).push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const content = (
    <>
      {sortedDates.map((date) => (
        <div key={date}>
          <div
            className="text-[10.5px] tracking-wider uppercase mb-2 mt-4 first:mt-0 font-medium"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-tertiary)",
            }}
          >
            {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          {grouped[date].map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg px-3.5 py-3 mb-2 group transition-colors"
              style={{
                background: "var(--card-elevated)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {entry.topic}
                  </div>
                  <div
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {entry.resource}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="opacity-0 group-hover:opacity-100 transition-all text-xs shrink-0 cursor-pointer px-1"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--danger)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        padding: "24px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-9.5">
        <h2
          className="text-base font-semibold flex items-center gap-2"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
          }}
        >
          <span style={{ color: "var(--accent)" }}>·</span> Recent Sessions
        </h2>
        {showViewAll && entries.length > 0 && (
          <Link
            href="/sessions"
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--accent)",
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-dim-border)",
            }}
          >
            View All
          </Link>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center flex-1 py-12 gap-3.5">
          <div
            className="w-[52px] h-[52px] rounded-xl flex items-center justify-center"
            style={{
              background: "var(--card-elevated)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-tertiary)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <div
            className="font-semibold text-[15px]"
            style={{ color: "var(--text-primary)" }}
          >
            No entries yet
          </div>
          <div
            className="text-[13px] max-w-[320px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Log your first study session on the left to start building your
            streak.
          </div>
        </div>
      ) : scrollable ? (
        <div className="relative flex-1">
          <div
            className="overflow-y-auto pr-1"
            style={{
              maxHeight: "480px",
              scrollbarWidth: "thin",
              scrollbarColor: "var(--border-strong) transparent",
            }}
          >
            {content}
          </div>
          <div
            className="absolute left-0 right-1 bottom-0 h-12 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--card))",
            }}
          />
        </div>
      ) : (
        <div>{content}</div>
      )}
    </div>
  );
}
