"use client";

import { useEffect, useState } from "react";
import {
  getTotalEntries,
  getStudyDays,
  getTopicsStudied,
} from "@/lib/storage";

interface Props {
  refreshKey: number;
}

export default function Stats({ refreshKey }: Props) {
  const [stats, setStats] = useState({
    total: 0,
    days: 0,
    topics: 0,
  });
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
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-900 rounded-xl p-5 border border-gray-800 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total Entries", value: stats.total },
    { label: "Study Days", value: stats.days },
    { label: "Unique Topics", value: stats.topics },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-gray-900 rounded-xl p-5 border border-gray-800"
        >
          <div className="text-2xl font-bold text-white">{card.value}</div>
          <div className="text-sm text-gray-400 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
