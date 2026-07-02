"use client";

import { useEffect, useState } from "react";
import { getUserEntries } from "@/lib/firestore";

interface Props {
  userId: string;
  refreshKey: number;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKLY_GOAL = 7;

export default function WeeklyProgress({ userId, refreshKey }: Props) {
  const [weekData, setWeekData] = useState<(number | null)[]>([null, null, null, null, null, null, null]);
  const [todayIdx, setTodayIdx] = useState(0);

  useEffect(() => {
    async function load() {
      const entries = await getUserEntries(userId);
      const now = new Date();
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() + mondayOffset);

      const counts: (number | null)[] = [];
      let total = 0;

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];

        if (d > now && d.toDateString() !== now.toDateString()) {
          counts.push(null);
        } else {
          const count = entries.filter((e) => e.date === dateStr).length;
          counts.push(count);
          total += count;
        }
      }

      const currentDay = now.getDay();
      setTodayIdx(currentDay === 0 ? 6 : currentDay - 1);
      setWeekData(counts);
    }
    load();
  }, [userId, refreshKey]);

  const activeDays = weekData.filter((c) => c !== null) as number[];
  const weekTotal = activeDays.reduce((sum, c) => sum + c, 0);
  const maxCount = Math.max(1, ...activeDays);
  const pct = Math.min(100, Math.round((weekTotal / WEEKLY_GOAL) * 100));

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
          <div
            className="text-xs"
            style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
          >
            {weekTotal} / {WEEKLY_GOAL} sessions
          </div>
        </div>
        <div
          className="h-[7px] rounded-full overflow-hidden mb-4"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #157a5c, var(--accent))",
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
