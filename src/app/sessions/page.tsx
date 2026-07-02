"use client";

import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import EntryList from "@/components/EntryList";
import { useRouter } from "next/navigation";

export default function SessionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-[800px] mx-auto px-6 sm:px-8 py-10 sm:py-14">
        <div className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm mb-4 cursor-pointer transition-colors"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            All Sessions
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Your complete study log history.
          </p>
        </div>
        <EntryList refreshKey={0} userId={user.uid} scrollable={false} />
      </div>
    </div>
  );
}
