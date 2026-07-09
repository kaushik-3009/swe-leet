"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { TLStoreSnapshot } from "tldraw";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import Markdown from "@/components/Markdown";
import SolutionPanel from "@/components/SolutionPanel";
import DesignCanvas from "@/components/canvas/DesignCanvas";
import { api, ApiError } from "@/lib/api";
import type { ProblemDetail, Submission, ProblemSolution } from "@/lib/types";

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "var(--stat-teal)",
  MEDIUM: "var(--stat-amber)",
  HARD: "var(--danger)",
};

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, loading: authLoading } = useAuth();

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [canvasSnapshot, setCanvasSnapshot] = useState<TLStoreSnapshot | undefined>(undefined);
  const [canvasKey, setCanvasKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<Submission | null>(null);
  const [solution, setSolution] = useState<ProblemSolution | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [revealSnapshot, setRevealSnapshot] = useState<TLStoreSnapshot | undefined>(undefined);

  const touchedRef = useRef(false);
  const latestSnapshotRef = useRef<TLStoreSnapshot | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const p = await api.get<ProblemDetail>(`/api/problems/${slug}`);
        setProblem(p);
        const subs = await api.get<Submission[]>(`/api/submissions?problemId=${p.id}`);
        setSubmissions(subs);
        if (subs.length > 0) {
          const newest = subs[0];
          setCanvasSnapshot(newest.canvasSnapshot as TLStoreSnapshot);
          latestSnapshotRef.current = newest.canvasSnapshot as TLStoreSnapshot;
          setLastResult(newest);
          touchedRef.current = true;
        }
      } catch {
        setProblem(null);
      }
      setLoading(false);
    }
    load();
  }, [slug, user]);

  const handleCanvasChange = useCallback(
    (snapshot: TLStoreSnapshot) => {
      latestSnapshotRef.current = snapshot;
      if (!touchedRef.current && problem) {
        touchedRef.current = true;
        api.post("/api/progress/touch", { problemId: problem.id }).catch(() => {});
      }
    },
    [problem]
  );

  async function handleSubmit() {
    if (!problem || !latestSnapshotRef.current) {
      setError("Draw something on the canvas before submitting.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post<{ submission: Submission }>("/api/submissions", {
        problemId: problem.id,
        canvasSnapshot: latestSnapshotRef.current,
      });
      setLastResult(res.submission);
      const subs = await api.get<Submission[]>(`/api/submissions?problemId=${problem.id}`);
      setSubmissions(subs);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to submit. Please try again.");
    }
    setSubmitting(false);
  }

  async function handleRevealSolution() {
    if (!problem) return;
    setError("");
    setRevealing(true);
    try {
      if (!touchedRef.current) {
        await api.post("/api/progress/touch", { problemId: problem.id });
        touchedRef.current = true;
      }
      const sol = await api.get<ProblemSolution>(`/api/problems/${slug}/solution`);
      setSolution(sol);
      setRevealSnapshot(latestSnapshotRef.current);
      setShowSolution(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the solution.");
    }
    setRevealing(false);
  }

  function handleLoadVersion(sub: Submission) {
    setCanvasSnapshot(sub.canvasSnapshot as TLStoreSnapshot);
    latestSnapshotRef.current = sub.canvasSnapshot as TLStoreSnapshot;
    setLastResult(sub);
    setCanvasKey((k) => k + 1);
  }

  if (authLoading || loading) {
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

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Problem not found</div>
          <button onClick={() => router.push("/roadmap")} className="mt-3 text-sm cursor-pointer" style={{ color: "var(--accent)" }}>
            Back to roadmap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-8">
        <div className="flex items-center gap-2 mb-4 text-xs" style={{ fontFamily: "var(--font-display)" }}>
          <button onClick={() => router.push("/roadmap")} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
            Roadmap
          </button>
          <span style={{ color: "var(--text-tertiary)" }}>/</span>
          <span style={{ color: "var(--text-secondary)" }}>{problem.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
          <div className="space-y-5">
            <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ fontFamily: "var(--font-display)", color: DIFFICULTY_COLOR[problem.difficulty], background: "var(--card-elevated)", border: "1px solid var(--border)" }}
                >
                  {problem.difficulty}
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>~{problem.estMinutes} min</span>
              </div>
              <h1 className="text-xl font-semibold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {problem.title}
              </h1>
              <Markdown text={problem.description} />
              <div className="flex flex-wrap gap-1.5 mt-4">
                {problem.tags.map((t) => (
                  <span key={t} className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)", background: "var(--card-elevated)", border: "1px solid var(--border)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {submissions.length > 0 && (
              <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                <h2 className="text-[13px] font-semibold mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Your Attempts
                </h2>
                <div className="space-y-1.5">
                  {submissions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadVersion(s)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                      style={{ background: lastResult?.id === s.id ? "var(--accent-dim)" : "var(--card-elevated)", border: `1px solid ${lastResult?.id === s.id ? "var(--accent-dim-border)" : "var(--border)"}` }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>Version {s.version}</span>
                      <span style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>{s.score}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lastResult && (
              <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Feedback</h2>
                  <span className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>{lastResult.score}%</span>
                </div>
                {lastResult.feedback.strengths.length > 0 && (
                  <FeedbackList title="Strengths" items={lastResult.feedback.strengths} color="var(--stat-teal)" />
                )}
                {lastResult.feedback.missing.length > 0 && (
                  <FeedbackList title="Missing" items={lastResult.feedback.missing} color="var(--danger)" />
                )}
                {lastResult.feedback.improvements.length > 0 && (
                  <FeedbackList title="Improvements" items={lastResult.feedback.improvements} color="var(--stat-amber)" />
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <DesignCanvas key={canvasKey} snapshot={canvasSnapshot} onChange={handleCanvasChange} height="600px" />

            {error && (
              <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: "rgba(220,38,38,0.08)", color: "var(--danger)", border: "1px solid rgba(220,38,38,0.2)" }}>
                {error}
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-lg py-3 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)", background: "var(--accent)", color: "var(--bg)", border: "1px solid var(--accent)" }}
                onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.boxShadow = "0 0 0 4px var(--accent-dim)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              >
                {submitting ? "Grading..." : "Submit for Grading"}
              </button>
              <button
                onClick={handleRevealSolution}
                disabled={revealing}
                className="px-5 rounded-lg py-3 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)", background: "var(--card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                {revealing ? "Loading..." : "View Solution"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSolution && solution && (
        <SolutionPanel
          problemTitle={problem.title}
          mySnapshot={revealSnapshot}
          solution={solution}
          onClose={() => setShowSolution(false)}
        />
      )}
    </div>
  );
}

function FeedbackList({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="text-[10.5px] tracking-wider uppercase mb-1.5 font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
            <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
