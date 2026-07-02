"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import AuthPage from "@/components/AuthPage";
import Navbar from "@/components/Navbar";
import Stats from "@/components/Stats";
import Heatmap from "@/components/Heatmap";
import AddEntryForm from "@/components/AddEntryForm";
import EntryList from "@/components/EntryList";
import { seedDemoDataFirestore, clearAllEntriesFirestore, seedDemoUsers } from "@/lib/firestore";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  async function handleSeedDemo() {
    if (!user) return;
    setSeeding(true);
    await seedDemoUsers();
    await seedDemoDataFirestore(user.uid);
    setSeeding(false);
    handleRefresh();
  }

  async function handleClear() {
    if (!user) return;
    setClearing(true);
    await clearAllEntriesFirestore(user.uid);
    setClearing(false);
    handleRefresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }} />
              Study Log
            </div>
            <h1 className="text-[28px] sm:text-[30px] font-semibold mb-1 tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              System Design Tracker
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Welcome back, <b>{profile?.displayName}</b>
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer disabled:opacity-50"
              style={{ fontFamily: "var(--font-body)", background: "var(--card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--text-tertiary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>
              {seeding ? "Loading..." : "Load Demo"}
            </button>
            <button
              onClick={handleClear}
              disabled={clearing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer disabled:opacity-50"
              style={{ fontFamily: "var(--font-body)", background: "var(--card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--danger)"; e.currentTarget.style.color = "var(--danger)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
              {clearing ? "Clearing..." : "Clear All"}
            </button>
          </div>
        </div>

        <div className="space-y-7">
          <Stats refreshKey={refreshKey} userId={user.uid} />
          <Heatmap refreshKey={refreshKey} userId={user.uid} />

          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5 items-start">
            <AddEntryForm onAdded={handleRefresh} userId={user.uid} refreshKey={refreshKey} />
            <EntryList refreshKey={refreshKey} userId={user.uid} showViewAll />
          </div>
        </div>
      </div>
    </div>
  );
}
