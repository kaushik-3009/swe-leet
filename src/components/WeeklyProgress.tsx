"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { WeeklyGoalProgress } from "@/lib/types";

interface Props {
  heatmap: Record<string, number>;
  goal: WeeklyGoalProgress | null;
  onGoalChanged: () => void;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DEFAULT_GOAL = 7;

function mondayOfThisWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + mondayOffset);
  return monday;
}

export default function WeeklyProgress({ heatmap, goal, onGoalChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal?.targetSessions ?? DEFAULT_GOAL);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const monday = mondayOfThisWeek();
  const weekData: (number | null)[] = [];
  let weekTotal = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    if (d > now && d.toDateString() !== now.toDateString()) {
      weekData.push(null);
    } else {
      const count = heatmap[dateStr] ?? 0;
      weekData.push(count);
      weekTotal += count;
    }
  }

  const currentDay = now.getDay();
  const todayIdx = currentDay === 0 ? 6 : currentDay - 1;
  const target = goal?.targetSessions ?? DEFAULT_GOAL;
  const activeDays = weekData.filter((c) => c !== null) as number[];
  const maxCount = Math.max(1, ...activeDays);
  const pct = Math.min(100, Math.round((weekTotal / target) * 100));

  async function save() {
    setSaving(true);
    try {
      await api.post("/api/goals", { targetSessions: value });
      setEditing(false);
      onGoalChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6">
      <div
        className="text-[10.5px] tracking-wider uppercase mb-2.5"
        style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
      >
        This week
      </div>
      <div
        className="rounded-lg p-4"
        style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
      >
        <div className="flex justify-between items-baseline mb-3">
          <div className="text-[13.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Weekly study goal
          </div>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={200}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-14 px-1.5 py-1 rounded text-xs"
                style={{ background: "var(--card)", border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}
              />
              <button onClick={save} disabled={saving} className="text-xs font-semibold cursor-pointer" style={{ color: "var(--accent)" }}>
                {saving ? "..." : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setValue(target); setEditing(true); }}
              className="text-xs cursor-pointer flex items-center gap-1.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
              title="Edit weekly goal"
            >
              {weekTotal} / {target} sessions
              <span style={{ color: "var(--text-tertiary)" }}>edit</span>
            </button>
          )}
        </div>
        <div
          className="h-[7px] rounded-full overflow-hidden mb-4"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? "var(--accent)" : "linear-gradient(90deg, #157a5c, var(--accent))",
            }}
          />
        </div>
        <div className="flex justify-between gap-2">
          {DAY_LABELS.map((label, i) => {
            const isFuture = weekData[i] === null;
            const count = weekData[i] ?? 0;
            const isToday = i === todayIdx;
            const barHeight = count === 0 ? 0 : Math.max(18, Math.round((count / maxCount) * 100));

            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 flex-1"
              >
                <div
                  className="text-[11px] h-3.5"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: isFuture ? "var(--text-tertiary)" : "var(--text-secondary)",
                  }}
                >
                  {isFuture ? "" : count}
                </div>
                <div
                  className="w-full h-[52px] rounded flex items-end overflow-hidden"
                  style={{
                    background: "var(--bg)",
                    border: isToday
                      ? "1px solid var(--accent-dim-border)"
                      : isFuture
                        ? "1px dashed var(--border)"
                        : "1px solid var(--border)",
                  }}
                >
                  {count > 0 && (
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${barHeight}%`,
                        background: "linear-gradient(180deg, var(--accent), #157a5c)",
                      }}
                    />
                  )}
                </div>
                <div
                  className="text-[10px] tracking-wide"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: isToday ? "var(--accent)" : "var(--text-tertiary)",
                    fontWeight: isToday ? 600 : 400,
                  }}
                >
                  {label}
                </div>
                {isToday && (
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{ background: "var(--accent)", marginTop: "-4px" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
