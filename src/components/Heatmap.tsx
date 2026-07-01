"use client";

import { useEffect, useState } from "react";
import { getHeatmapData } from "@/lib/storage";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getCellColor(count: number): string {
  if (count === 0) return "bg-gray-800";
  if (count === 1) return "bg-emerald-900";
  if (count === 2) return "bg-emerald-700";
  if (count === 3) return "bg-emerald-500";
  return "bg-emerald-400";
}

export default function Heatmap() {
  const [data, setData] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setData(getHeatmapData());
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 animate-pulse h-48" />
    );
  }

  const today = new Date();
  const weeks: { date: Date; count: number }[][] = [];
  let currentWeek: { date: Date; count: number }[] = [];

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const d = new Date(startDate);
  while (d <= today) {
    const dateStr = d.toISOString().split("T")[0];
    currentWeek.push({ date: new Date(d), count: data[dateStr] || 0 });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    d.setDate(d.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const firstDay = week[0];
    const month = firstDay.date.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ label: MONTHS[month], weekIndex: i });
      lastMonth = month;
    }
  });

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">
        Activity — Last 12 Months
      </h2>
      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="flex gap-0.5 mb-1 ml-8">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-xs text-gray-500"
                style={{
                  marginLeft:
                    i === 0
                      ? `${m.weekIndex * 14}px`
                      : `${(m.weekIndex - (monthLabels[i - 1]?.weekIndex ?? 0) - 1) * 14 + 14}px`,
                }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div className="flex gap-0.5">
            <div className="flex flex-col gap-0.5 mr-1 text-xs text-gray-500">
              {DAYS.map((day, i) => (
                <div key={day} className="h-3 leading-3">
                  {i % 2 === 1 ? day : ""}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-sm ${getCellColor(day.count)} transition-colors`}
                    title={`${day.date.toLocaleDateString()}: ${day.count} ${day.count === 1 ? "topic" : "topics"}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 mt-3 ml-8 text-xs text-gray-500">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-gray-800" />
            <div className="w-3 h-3 rounded-sm bg-emerald-900" />
            <div className="w-3 h-3 rounded-sm bg-emerald-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
