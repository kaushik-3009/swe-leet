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
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 animate-pulse h-64" />
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center text-gray-500">
        No entries yet. Start logging your system design studies above!
      </div>
    );
  }

  const grouped = entries.reduce<Record<string, StudyEntry[]>>((acc, entry) => {
    (acc[entry.date] = acc[entry.date] || []).push(entry);
    return acc;
  }, {});

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Study Log</h2>
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, dayEntries]) => (
          <div key={date}>
            <div className="text-sm text-gray-500 mb-2 font-medium">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div className="space-y-2">
              {dayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-4 bg-gray-800/50 rounded-lg p-3 group"
                >
                  <div>
                    <div className="text-white font-medium">{entry.topic}</div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {entry.resource}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm shrink-0"
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
    </div>
  );
}
