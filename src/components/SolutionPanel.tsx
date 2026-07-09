"use client";

import type { TLStoreSnapshot } from "tldraw";
import DesignCanvas from "@/components/canvas/DesignCanvas";
import Markdown from "@/components/Markdown";
import type { ProblemSolution } from "@/lib/types";

interface Props {
  problemTitle: string;
  mySnapshot: TLStoreSnapshot | undefined;
  solution: ProblemSolution;
  onClose: () => void;
}

export default function SolutionPanel({ problemTitle, mySnapshot, solution, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg)" }}>
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow-sm)" }}
      >
        <div>
          <div className="text-xs tracking-widest uppercase mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            Reference Solution
          </div>
          <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            {problemTitle}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
          style={{ background: "var(--card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-[1400px] mx-auto space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <div className="text-[11px] tracking-wider uppercase mb-2 font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
                Your Submission
              </div>
              {mySnapshot ? (
                <DesignCanvas snapshot={mySnapshot} readOnly height="420px" />
              ) : (
                <div
                  className="rounded-xl flex items-center justify-center text-sm"
                  style={{ height: "420px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-tertiary)" }}
                >
                  No submission yet
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] tracking-wider uppercase mb-2 font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
                Reference Solution
              </div>
              <DesignCanvas snapshot={solution.referenceDiagram as TLStoreSnapshot} readOnly height="420px" />
            </div>
          </div>

          <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-base font-semibold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Design Rationale
            </h3>
            <Markdown text={solution.referenceExplanation} />
          </div>

          {solution.rubric.requiredComponents.length > 0 && (
            <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                Expected Components & Connections
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {solution.rubric.requiredComponents.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ fontFamily: "var(--font-display)", background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="space-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                {solution.rubric.requiredConnections.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span style={{ color: "var(--text-tertiary)" }}>{c.from}</span>
                    <span style={{ color: "var(--accent)" }}>&rarr;</span>
                    <span style={{ color: "var(--text-tertiary)" }}>{c.to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
