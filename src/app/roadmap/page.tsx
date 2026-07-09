"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import type { CategoryWithProgress, Track } from "@/lib/types";

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "var(--stat-teal)",
  MEDIUM: "var(--stat-amber)",
  HARD: "var(--danger)",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SOLVED: "Solved",
};

export default function RoadmapPage() {
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

  const totalProblems = categories.reduce((sum, c) => sum + c.problems.length, 0);
  const solvedProblems = categories.reduce((sum, c) => sum + c.problems.filter((p) => p.status === "SOLVED").length, 0);
  const overallPct = totalProblems === 0 ? 0 : Math.round((solvedProblems / totalProblems) * 100);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }} />
              Practice Roadmap
            </div>
            <h1 className="text-[28px] sm:text-[30px] font-semibold mb-1 tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {track === "SYSTEM_DESIGN" ? "System Design" : "Low-Level Design"}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {solvedProblems} of {totalProblems} problems solved &middot; {overallPct}% complete
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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl h-40 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {categories.map((cat) => (
              <div key={cat.id} className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{cat.title}</h2>
                    <p className="text-[13px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{cat.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>{cat.progressPct}%</div>
                  </div>
                </div>

                <div className="h-[6px] rounded-full overflow-hidden mb-5 mt-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${cat.progressPct}%`, background: "linear-gradient(90deg, #157a5c, var(--accent))" }} />
                </div>

                <div className="space-y-2">
                  {cat.problems.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/practice/${p.slug}`)}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg text-left cursor-pointer transition-colors"
                      style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusDot status={p.status} />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{p.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px]" style={{ fontFamily: "var(--font-display)", color: DIFFICULTY_COLOR[p.difficulty] }}>{p.difficulty}</span>
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>&middot; ~{p.estMinutes} min</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className="text-[11px] px-2.5 py-1 rounded-full shrink-0"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: p.status === "SOLVED" ? "var(--accent)" : "var(--text-tertiary)",
                          background: p.status === "SOLVED" ? "var(--accent-dim)" : "var(--card)",
                          border: `1px solid ${p.status === "SOLVED" ? "var(--accent-dim-border)" : "var(--border)"}`,
                        }}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "SOLVED" ? "var(--accent)" : status === "IN_PROGRESS" ? "var(--stat-amber)" : "var(--text-tertiary)";
  return <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />;
}
