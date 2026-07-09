"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import type { CategoryWithProgress, Track } from "@/lib/types";

export default function StudyPlanIndexPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [track, setTrack] = useState<Track>("SYSTEM_DESIGN");
  const [categories, setCategories] = useState<CategoryWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const data = await api.get<CategoryWithProgress[]>(`/api/roadmap?track=${track}`);
        setCategories(data);
      } catch {
        setCategories([]);
      }
      setLoading(false);
    }
    load();
  }, [track, user]);

  if (authLoading) {
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
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }} />
              Study Plan
            </div>
            <h1 className="text-[28px] sm:text-[30px] font-semibold mb-1 tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {track === "SYSTEM_DESIGN" ? "System Design" : "Low-Level Design"}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Read curated resources per topic, then bridge into a small set of practice problems. For the full problem catalog, see the{" "}
              <button onClick={() => router.push("/roadmap")} className="cursor-pointer underline" style={{ color: "var(--accent)" }}>
                Roadmap
              </button>
              .
            </p>
          </div>

          <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid var(--border-strong)" }}>
            {(["SYSTEM_DESIGN", "LLD"] as Track[]).map((t) => (
              <button
                key={t}
                onClick={() => setTrack(t)}
                className="px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
                style={{
                  fontFamily: "var(--font-body)",
                  background: track === t ? "var(--accent)" : "var(--card-elevated)",
                  color: track === t ? "var(--bg)" : "var(--text-secondary)",
                }}
              >
                {t === "SYSTEM_DESIGN" ? "System Design" : "LLD"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl h-32 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => router.push(`/study-plan/${cat.slug}`)}
                className="text-left rounded-xl p-5 cursor-pointer transition-all"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <h2 className="text-base font-semibold mb-1.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  {cat.title}
                </h2>
                <p className="text-[13px] mb-4 line-clamp-2" style={{ color: "var(--text-tertiary)" }}>
                  {cat.description}
                </p>
                <div className="flex items-center justify-between text-[11px]" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
                  <span>{cat.problems.length} practice problem{cat.problems.length === 1 ? "" : "s"}</span>
                  <span style={{ color: "var(--accent)" }}>Open topic &rarr;</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
