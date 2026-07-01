"use client";

import { useTheme } from "./ThemeProvider";

interface Props {
  onSeedDemo: () => void;
  onClear: () => void;
}

export default function Header({ onSeedDemo, onClear }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start gap-5 mb-10">
      <div>
        <div
          className="flex items-center gap-2 mb-2.5 text-xs tracking-widest uppercase"
          style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }}
          />
          Study Log
        </div>
        <h1
          className="text-[28px] sm:text-[30px] font-semibold mb-2 tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          System Design Tracker
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Track your system design study progress and stay consistent.
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggle}
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-all cursor-pointer"
          style={{
            background: "var(--card-elevated)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-secondary)",
          }}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </button>
        <button
          onClick={onSeedDemo}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer"
          style={{
            fontFamily: "var(--font-body)",
            background: "var(--card-elevated)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--text-tertiary)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>
          Load Demo
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer"
          style={{
            fontFamily: "var(--font-body)",
            background: "var(--card-elevated)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--danger)";
            e.currentTarget.style.color = "var(--danger)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
          Clear All
        </button>
      </div>
    </header>
  );
}
