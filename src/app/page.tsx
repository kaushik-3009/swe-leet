"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Stats from "@/components/Stats";
import Heatmap from "@/components/Heatmap";
import AddEntryForm from "@/components/AddEntryForm";
import EntryList from "@/components/EntryList";
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
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-10 sm:py-14">
        <Header onSeedDemo={handleSeedDemo} onClear={handleClear} />

        <div className="space-y-7">
          <Stats refreshKey={refreshKey} />
          <Heatmap refreshKey={refreshKey} />

          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5">
            <AddEntryForm onAdded={handleRefresh} />
            <EntryList refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
