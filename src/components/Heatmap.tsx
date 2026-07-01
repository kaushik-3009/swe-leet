"use client";

import { useEffect, useState } from "react";
import { ActivityHeatmapMonth } from "react-activity-heatmap";
import type { HeatmapActivity } from "react-activity-heatmap";
import { getHeatmapData } from "@/lib/storage";

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

export default function Heatmap() {
  const [activities, setActivities] = useState<HeatmapActivity[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const data = getHeatmapData();
    const result: HeatmapActivity[] = Object.entries(data).map(([date, count]) => ({
      date: new Date(date + "T12:00:00"),
      count,
      level: getLevel(count),
    }));
    setActivities(result);
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 animate-pulse h-48" />
    );
  }

  const year = new Date().getFullYear();
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">
        Activity — {year}
      </h2>
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {months.map((m) => (
            <ActivityHeatmapMonth
              key={`${m}-${year}`}
              activities={activities}
              month={m}
              year={year}
              cellStyle={{ borderRadius: "0.2rem" }}
              monthNameStyle={{ fontWeight: "600", fontSize: "0.75rem", color: "#9ca3af" }}
              tooltipStyle={{
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "#f9fafb",
                fontSize: "0.75rem",
              }}
              customCellColors={{
                level0: "#1f2937",
                level1: "#064e3b",
                level2: "#047857",
                level3: "#059669",
                level4: "#10b981",
              }}
              monthNameFormat="short"
            />
          ))}
        </div>
        <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#1f2937" }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#064e3b" }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#047857" }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#059669" }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#10b981" }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
