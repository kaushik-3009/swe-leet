"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { TLStoreSnapshot, Editor } from "tldraw";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import Markdown from "@/components/Markdown";
import SolutionPanel from "@/components/SolutionPanel";
import DesignCanvas from "@/components/canvas/DesignCanvas";
import ArchitectureShapePalette from "@/components/canvas/ArchitectureShapePalette";
import CodeEditor from "@/components/CodeEditor";
import { api, ApiError } from "@/lib/api";
import type { ProblemDetail, Submission, CodeSubmission, CodeRun, ProblemSolution, SubmissionFeedback } from "@/lib/types";

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "var(--stat-teal)",
  MEDIUM: "var(--stat-amber)",
  HARD: "var(--danger)",
};

type Mode = "canvas" | "code";

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, loading: authLoading } = useAuth();

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [mode, setMode] = useState<Mode>("canvas");

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [canvasSnapshot, setCanvasSnapshot] = useState<TLStoreSnapshot | undefined>(undefined);
  const [canvasKey, setCanvasKey] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);

  const [codeSubmissions, setCodeSubmissions] = useState<CodeSubmission[]>([]);
  const [code, setCode] = useState("");
  const [codeRun, setCodeRun] = useState<CodeRun | null>(null);
  const [runCode, setRunCode] = useState("");
  const [runningCode, setRunningCode] = useState(false);
  const [runError, setRunError] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<{ score: number; feedback: SubmissionFeedback } | null>(null);
  const [solution, setSolution] = useState<ProblemSolution | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [revealSnapshot, setRevealSnapshot] = useState<TLStoreSnapshot | undefined>(undefined);
  const [revealCode, setRevealCode] = useState<string | undefined>(undefined);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);

  const touchedRef = useRef(false);
  const latestSnapshotRef = useRef<TLStoreSnapshot | undefined>(undefined);
  const latestCodeRef = useRef("");

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const p = await api.get<ProblemDetail>(`/api/problems/${slug}`);
        setProblem(p);
        if (p.track === "LLD") {
          setMode("canvas");
          setCode(`# Write your ${p.title} implementation here.\n`);
        }

        const subs = await api.get<Submission[]>(`/api/submissions?problemId=${p.id}`);
        setSubmissions(subs);
        if (subs.length > 0) {
          const newest = subs[0];
          setCanvasSnapshot(newest.canvasSnapshot as TLStoreSnapshot);
          latestSnapshotRef.current = newest.canvasSnapshot as TLStoreSnapshot;
          setLastResult(newest);
          touchedRef.current = true;
        }

        if (p.track === "LLD") {
          const codeSubs = await api.get<CodeSubmission[]>(`/api/code-submissions?problemId=${p.id}`);
          setCodeSubmissions(codeSubs);
          if (codeSubs.length > 0) {
            const newest = codeSubs[0];
            setCode(newest.code);
            latestCodeRef.current = newest.code;
            if (subs.length === 0 || newest.createdAt > subs[0].createdAt) {
              setLastResult(newest);
              setMode("code");
            }
            touchedRef.current = true;
          }
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

  function handleCodeChange(value: string) {
    setCode(value);
    latestCodeRef.current = value;
    setRunError("");
    if (!touchedRef.current && problem) {
      touchedRef.current = true;
      api.post("/api/progress/touch", { problemId: problem.id }).catch(() => {});
    }
  }

  async function handleRunPublicTests() {
    if (!problem || !latestCodeRef.current.trim()) {
      setRunError("Write some code before running public tests.");
      return;
    }
    setRunError("");
    setRunningCode(true);
    try {
      const response = await api.post<{ run: CodeRun }>("/api/code-runs", {
        problemId: problem.id,
        code: latestCodeRef.current,
        language: "python",
      });
      setCodeRun(response.run);
      setRunCode(latestCodeRef.current);
    } catch (e) {
      setRunError(e instanceof ApiError ? e.message : "Public tests could not run.");
    } finally {
      setRunningCode(false);
    }
  }

  async function handleSubmit() {
    if (!problem) return;
    setError("");

    if (mode === "canvas") {
      if (!latestSnapshotRef.current) {
        setError("Draw something on the canvas before submitting.");
        return;
      }
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
    } else {
      if (!latestCodeRef.current.trim()) {
        setError("Write some code before submitting.");
        return;
      }
      setSubmitting(true);
      try {
        const res = await api.post<{ submission: CodeSubmission }>("/api/code-submissions", {
          problemId: problem.id,
          code: latestCodeRef.current,
          language: problem.solutionCodeLanguage,
        });
        setLastResult(res.submission);
        const subs = await api.get<CodeSubmission[]>(`/api/code-submissions?problemId=${problem.id}`);
        setCodeSubmissions(subs);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to submit. Please try again.");
      }
      setSubmitting(false);
    }
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
      setRevealCode(latestCodeRef.current);
      setShowSolution(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the solution.");
    }
    setRevealing(false);
  }

  function handleLoadVersion(sub: Submission) {
    setMode("canvas");
    setCanvasSnapshot(sub.canvasSnapshot as TLStoreSnapshot);
    latestSnapshotRef.current = sub.canvasSnapshot as TLStoreSnapshot;
    setLastResult(sub);
    setCanvasKey((k) => k + 1);
  }

  function handleLoadCodeVersion(sub: CodeSubmission) {
    setMode("code");
    setCode(sub.code);
    latestCodeRef.current = sub.code;
    setLastResult(sub);
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

  const isLld = problem.track === "LLD";

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-8">
        <div className="flex items-center gap-2 mb-4 text-xs" style={{ fontFamily: "var(--font-display)" }}>
          <button onClick={() => router.push("/roadmap")} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
            Roadmap
          </button>
          <span style={{ color: "var(--text-tertiary)" }}>/</span>
          <span style={{ color: "var(--text-secondary)" }}>{problem.title}</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-5 items-start">
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
              {problem.videoUrl && (
                <a
                  href={problem.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-medium hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  Watch a walkthrough video &rarr;
                </a>
              )}
            </div>

            {(problem.generalHint || problem.stepHints.length > 0) && (
              <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                <button onClick={() => setHintsOpen((v) => !v)} className="w-full flex items-center justify-between cursor-pointer">
                  <h2 className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                    Hints
                  </h2>
                  <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{hintsOpen ? "Hide" : "Show"}</span>
                </button>
                {hintsOpen && (
                  <div className="mt-3.5 space-y-3">
                    {problem.generalHint && (
                      <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{problem.generalHint}</p>
                    )}
                    {problem.stepHints.slice(0, revealedHints).map((h, i) => (
                      <div key={i} className="text-[13px] px-3 py-2 rounded-lg" style={{ background: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        <span className="font-semibold" style={{ color: "var(--accent)" }}>Hint {i + 1}:</span> {h}
                      </div>
                    ))}
                    {revealedHints < problem.stepHints.length && (
                      <button
                        onClick={() => setRevealedHints((n) => n + 1)}
                        className="text-[12.5px] font-semibold cursor-pointer"
                        style={{ color: "var(--accent)" }}
                      >
                        Reveal hint {revealedHints + 1} of {problem.stepHints.length} &rarr;
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {isLld && (submissions.length > 0 || codeSubmissions.length > 0) && (
              <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                <h2 className="text-[13px] font-semibold mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Your Attempts
                </h2>
                <div className="space-y-1.5">
                  {submissions.map((s) => (
                    <button
                      key={`canvas-${s.id}`}
                      onClick={() => handleLoadVersion(s)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                      style={{ background: mode === "canvas" && lastResult === s ? "var(--accent-dim)" : "var(--card-elevated)", border: "1px solid var(--border)" }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>Canvas v{s.version}</span>
                      <span style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>{s.score}%</span>
                    </button>
                  ))}
                  {codeSubmissions.map((s) => (
                    <button
                      key={`code-${s.id}`}
                      onClick={() => handleLoadCodeVersion(s)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                      style={{ background: mode === "code" && lastResult === s ? "var(--accent-dim)" : "var(--card-elevated)", border: "1px solid var(--border)" }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>Code v{s.version}</span>
                      <span style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>{s.score}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isLld && submissions.length > 0 && (
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
                      style={{ background: lastResult === s ? "var(--accent-dim)" : "var(--card-elevated)", border: "1px solid var(--border)" }}
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
            {isLld && (
              <div className="flex rounded-lg overflow-hidden w-fit" style={{ border: "1px solid var(--border-strong)" }}>
                {(["canvas", "code"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="px-4 py-1.5 text-[12.5px] font-semibold cursor-pointer transition-colors"
                    style={{
                      fontFamily: "var(--font-body)",
                      background: mode === m ? "var(--accent)" : "var(--card-elevated)",
                      color: mode === m ? "var(--bg)" : "var(--text-secondary)",
                    }}
                  >
                    {m === "canvas" ? "Class Diagram" : "Write Code"}
                  </button>
                ))}
              </div>
            )}

            {mode === "canvas" ? (
              <>
                <ArchitectureShapePalette editor={editor} diagramType={problem.diagramType} />
                <DesignCanvas
                  key={canvasKey}
                  snapshot={canvasSnapshot}
                  onChange={handleCanvasChange}
                  onEditorReady={setEditor}
                  height="min(72vh, 760px)"
                />
              </>
            ) : (
              <>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="px-4 py-2 text-[11px] flex items-center justify-between" style={{ background: "var(--card-elevated)", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
                    <span>{problem.solutionCodeLanguage}</span>
                    <span>CodeMirror workspace · OnlineCompiler public tests</span>
                  </div>
                  <CodeEditor value={code} onChange={handleCodeChange} />
                </div>
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Public tests</div>
                    <div className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>Runs the trusted public harness for this problem.</div>
                  </div>
                  <button
                    onClick={handleRunPublicTests}
                    disabled={runningCode}
                    className="px-3 py-2 rounded-lg text-[12px] font-semibold cursor-pointer disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "var(--bg)", border: "1px solid var(--accent)" }}
                  >
                    {runningCode ? "Running..." : "Run public tests"}
                  </button>
                </div>
                {runError && <div className="text-xs rounded-lg px-3 py-2" style={{ color: "var(--danger)", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>{runError}</div>}
                {codeRun && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span>{codeRun.summary.passed}/{codeRun.summary.total} tests passed</span>
                      <span style={{ color: codeRun.status === "PASSED" ? "var(--stat-teal)" : codeRun.status === "PROVIDER_ERROR" ? "var(--stat-amber)" : "var(--danger)" }}>{codeRun.status}</span>
                    </div>
                    {runCode !== code && <div className="text-[11px]" style={{ color: "var(--stat-amber)" }}>Code changed since this run. Run again before submitting.</div>}
                    {codeRun.tests.map((test) => (
                      <div key={test.id} className="rounded-lg px-3 py-2 flex items-start justify-between gap-3" style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}>
                        <div className="min-w-0">
                          <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{test.name}</div>
                          {test.status === "provider_error" ? (
                            <div className="text-[11px] mt-1 break-words" style={{ color: "var(--stat-amber)" }}>
                              OnlineCompiler could not execute this test. Your code was not classified as a runtime failure; retry shortly.
                              {test.error ? ` ${test.error}` : ""}
                            </div>
                          ) : test.error ? (
                            <div className="text-[11px] mt-1 break-words" style={{ color: "var(--danger)" }}>{test.error}</div>
                          ) : null}
                          {!test.error && test.status !== "provider_error" && test.output && <pre className="text-[11px] mt-1 whitespace-pre-wrap" style={{ color: "var(--text-tertiary)" }}>{test.output}</pre>}
                        </div>
                        <span className="text-[11px] font-semibold shrink-0" style={{ color: test.passed ? "var(--stat-teal)" : test.status === "provider_error" ? "var(--stat-amber)" : "var(--danger)" }}>{test.passed ? "PASS" : test.status.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>
            )}

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
                {submitting ? "Grading..." : `Submit ${mode === "code" ? "Code" : "Diagram"} for Grading`}
              </button>
              <button
                onClick={handleRevealSolution}
                disabled={revealing}
                className="px-5 rounded-lg py-3 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)", background: "var(--card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                title="Reveals the solution step by step, so you can still think it through"
              >
                {revealing ? "Loading..." : "I'm Stuck, Reveal Solution"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSolution && solution && (
        <SolutionPanel
          problemTitle={problem.title}
          mySnapshot={revealSnapshot}
          myCode={isLld ? revealCode : undefined}
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
