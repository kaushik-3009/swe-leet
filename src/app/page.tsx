"use client";

import { useState } from "react";
import AddEntryForm from "@/components/AddEntryForm";
import EntryList from "@/components/EntryList";
import Heatmap from "@/components/Heatmap";
import Stats from "@/components/Stats";
import { seedDemoData, clearAllData } from "@/lib/storage";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  function handleSeedDemo() {
    seedDemoData();
    handleRefresh();
  }

  function handleClear() {
    clearAllData();
    handleRefresh();
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              System Design Tracker
            </h1>
            <p className="text-gray-400">
              Track your system design study progress and stay consistent.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSeedDemo}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors"
            >
              Load Demo Data
            </button>
            <button
              onClick={handleClear}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 border border-gray-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <Stats refreshKey={refreshKey} />
          <Heatmap refreshKey={refreshKey} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <AddEntryForm onAdded={handleRefresh} />
            </div>
            <div className="lg:col-span-3">
              <EntryList refreshKey={refreshKey} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
