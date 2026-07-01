"use client";

import { useState } from "react";
import AddEntryForm from "@/components/AddEntryForm";
import EntryList from "@/components/EntryList";
import Heatmap from "@/components/Heatmap";
import Stats from "@/components/Stats";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white mb-1">
          System Design Tracker
        </h1>
        <p className="text-gray-400 mb-8">
          Track your system design study progress and stay consistent.
        </p>

        <div className="space-y-6">
          <Stats refreshKey={refreshKey} />
          <Heatmap />
          <AddEntryForm onAdded={handleRefresh} />
          <EntryList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
