"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import Markdown from "@/components/Markdown";
import { api } from "@/lib/api";
import type { TopicPageData, ResourceKind } from "@/lib/types";

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "var(--stat-teal)",
  MEDIUM: "var(--stat-amber)",
  HARD: "var(--danger)",
};

const KIND_LABEL: Record<ResourceKind, string> = {
  EXTERNAL: "External",
  ARTICLE: "Our guide",
};

export default function TopicPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<TopicPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArticle, setShowArticle] = useState(false);
  const viewLoggedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const d = await api.get<TopicPageData>(`/api/categories/${slug}`);
        setData(d);
      } catch {
        setData(null);
      }
      setLoading(false);
    }
    load();
  }, [slug, user]);

  function openArticle() {
    setShowArticle(true);
    if (!viewLoggedRef.current) {
      viewLoggedRef.current = true;
      api.post(`/api/categories/${slug}/view`).catch(() => {});
    }
  }

  async function toggleResource(resourceId: string, next: boolean) {
    if (!data) return;
    setData({ ...data, resources: data.resources.map((r) => (r.id === resourceId ? { ...r, completed: next } : r)) });
    try {
      await api.post("/api/resources/toggle", { resourceId, done: next });
    } catch {
      setData((prev) => prev && { ...prev, resources: prev.resources.map((r) => (r.id === resourceId ? { ...r, completed: !next } : r)) });
    }
  }

  async function toggleProblem(problemId: string, next: boolean) {
    if (!data) return;
    setData({
      ...data,
      subsetProblems: data.subsetProblems.map((p) => (p.id === problemId ? { ...p, status: next ? "SOLVED" : "IN_PROGRESS" } : p)),
    });
    try {
      await api.post("/api/progress/checklist", { problemId, done: next });
    } catch {
      setData((prev) => prev && { ...prev, subsetProblems: prev.subsetProblems.map((p) => (p.id === problemId ? { ...p, status: next ? "IN_PROGRESS" : "SOLVED" } : p)) });
    }
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

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Topic not found</div>
          <button onClick={() => router.push("/study-plan")} className="mt-3 text-sm cursor-pointer" style={{ color: "var(--accent)" }}>
            Back to study plan
          </button>
        </div>
      </div>
    );
  }

  const { category, resources, subsetProblems } = data;
  const readCount = resources.filter((r) => r.completed).length;
  const solvedCount = subsetProblems.filter((p) => p.status === "SOLVED").length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-8">
        <div className="flex items-center gap-2 mb-4 text-xs" style={{ fontFamily: "var(--font-display)" }}>
          <button onClick={() => router.push("/study-plan")} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
            Study Plan
          </button>
          <span style={{ color: "var(--text-tertiary)" }}>/</span>
          <span style={{ color: "var(--text-secondary)" }}>{category.title}</span>
        </div>

        <div className="mb-8">
          <h1 className="text-[26px] font-semibold mb-1.5 tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            {category.title}
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>{category.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-5">
            <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "22px", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Study Resources
                </h2>
                <span className="text-[11px]" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
                  {readCount} / {resources.length} done
                </span>
              </div>

              <div className="space-y-2">
                {resources.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-lg"
                    style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
                  >
                    <input
                      type="checkbox"
                      checked={r.completed}
                      onChange={(e) => toggleResource(r.id, e.target.checked)}
                      className="w-4 h-4 shrink-0 cursor-pointer"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <div className="min-w-0 flex-1">
                      {r.kind === "ARTICLE" ? (
                        <button onClick={openArticle} className="text-sm font-medium text-left cursor-pointer truncate block" style={{ color: "var(--text-primary)" }}>
                          {r.title}
                        </button>
                      ) : (
                        <a
                          href={r.url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium truncate block hover:underline"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {r.title}
                        </a>
                      )}
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                      style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)", background: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      {KIND_LABEL[r.kind]}
                    </span>
                  </div>
                ))}
                {resources.length === 0 && (
                  <p className="text-sm py-3" style={{ color: "var(--text-tertiary)" }}>No resources listed for this topic yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "22px", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Bridge into Practice
                </h2>
                <span className="text-[11px]" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
                  {solvedCount} / {subsetProblems.length} solved
                </span>
              </div>
              <p className="text-[13px] mb-4" style={{ color: "var(--text-tertiary)" }}>
                A small curated set of problems for this topic. Solving them here or from the full{" "}
                <button onClick={() => router.push("/roadmap")} className="cursor-pointer underline" style={{ color: "var(--accent)" }}>
                  Roadmap
                </button>{" "}
                list stays in sync.
              </p>
              <div className="space-y-2">
                {subsetProblems.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-lg"
                    style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
                  >
                    <input
                      type="checkbox"
                      checked={p.status === "SOLVED"}
                      onChange={(e) => toggleProblem(p.id, e.target.checked)}
                      className="w-4 h-4 shrink-0 cursor-pointer"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <button onClick={() => router.push(`/practice/${p.slug}`)} className="min-w-0 flex-1 text-left cursor-pointer">
                      <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{p.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px]" style={{ fontFamily: "var(--font-display)", color: DIFFICULTY_COLOR[p.difficulty] }}>{p.difficulty}</span>
                        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>&middot; ~{p.estMinutes} min</span>
                      </div>
                    </button>
                  </div>
                ))}
                {subsetProblems.length === 0 && (
                  <p className="text-sm py-3" style={{ color: "var(--text-tertiary)" }}>No practice problems tagged to this topic yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl sticky top-20" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
            <h2 className="text-[13px] font-semibold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {category.articleTitle || "On-Site Guide"}
            </h2>
            <p className="text-[13px] mb-4" style={{ color: "var(--text-tertiary)" }}>
              Our own written, illustrated walkthrough of this topic, read it here without leaving the app.
            </p>
            <button
              onClick={openArticle}
              className="w-full rounded-lg py-2.5 text-sm font-semibold cursor-pointer transition-all"
              style={{ fontFamily: "var(--font-body)", background: "var(--accent)", color: "var(--bg)", border: "1px solid var(--accent)" }}
            >
              Read the article
            </button>
          </div>
        </div>
      </div>

      {showArticle && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg)" }}>
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow-sm)" }}
          >
            <div>
              <div className="text-xs tracking-widest uppercase mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
                {category.title}
              </div>
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {category.articleTitle || "On-Site Guide"}
              </h2>
            </div>
            <button
              onClick={() => setShowArticle(false)}
              className="px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
              style={{ background: "var(--card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-3xl mx-auto">
              {category.articleContent ? (
                <Markdown text={category.articleContent} />
              ) : (
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No article written for this topic yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
