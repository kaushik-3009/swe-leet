"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityHeatmapMonth } from "react-activity-heatmap";
import type { HeatmapActivity } from "react-activity-heatmap";
import { api } from "@/lib/api";
import type { StudyEntry } from "@/lib/types";

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  refreshKey?: number;
  userId: string;
}

export default function Heatmap({ refreshKey, userId }: Props) {
  const [activities, setActivities] = useState<HeatmapActivity[]>([]);
  const [studyDays, setStudyDays] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const entries = await api.get<StudyEntry[]>(`/api/entries?userId=${userId}`);
      const data: Record<string, number> = {};
      for (const e of entries) data[e.date] = (data[e.date] || 0) + 1;
      const result: HeatmapActivity[] = Object.entries(data).map(([date, count]) => ({
        date: new Date(date + "T12:00:00"),
        count,
        level: getLevel(count),
      }));
      setActivities(result);
      setStudyDays(new Set(entries.map((e) => e.date)).size);
      setMounted(true);
    }
    load();
  }, [refreshKey, userId]);

  useEffect(() => {
    if (!mounted) return;

    function updateScale() {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;
      const containerWidth = container.offsetWidth;
      const contentWidth = content.scrollWidth;
      const newScale = Math.min(1, containerWidth / contentWidth);
      setScale(newScale);
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [mounted, activities]);

  if (!mounted) {
    return (
      <div className="rounded-xl h-52 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
    );
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const year = now.getFullYear();
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div
      className="rounded-xl"
      style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "24px 26px 20px", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-2 mb-5">
        <h2 className="text-[15px] font-semibold flex items-baseline gap-2.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Activity
          <span className="text-[13px] font-medium" style={{ color: "var(--accent)" }}>· {MONTHS_LONG[currentMonth]} {year}</span>
        </h2>
        <div
          className="text-[11.5px] px-2.5 py-1 rounded-full"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)", background: "var(--card-elevated)", border: "1px solid var(--border)" }}
        >
          Current streak: <b style={{ color: "var(--accent)", fontWeight: 600 }}>{studyDays} days</b>
        </div>
      </div>

      <div ref={containerRef} className="overflow-hidden">
        <div ref={contentRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", height: scale < 1 ? `${160 * scale}px` : undefined }}>
          <div className="flex gap-3">
            {months.map((m) => (
              <ActivityHeatmapMonth
                key={`${m}-${year}`}
                activities={activities}
                month={m}
                year={year}
                cellStyle={{ borderRadius: "0.2rem" }}
                monthNameStyle={{ fontWeight: "600", fontSize: "0.7rem", color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}
                tooltipStyle={{ border: "1px solid var(--border-strong)", background: "var(--card-elevated)", color: "var(--text-primary)", fontSize: "0.75rem", fontFamily: "var(--font-body)" }}
                customCellColors={{ level0: "var(--heatmap-0)", level1: "var(--heatmap-1)", level2: "var(--heatmap-2)", level3: "var(--heatmap-3)", level4: "var(--heatmap-4)" }}
                monthNameFormat="short"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
        Less
        <span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-0)" }} />
        <span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-1)" }} />
        <span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-2)" }} />
        <span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-3)" }} />
        <span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-4)" }} />
        More
      </div>
    </div>
  );
}
