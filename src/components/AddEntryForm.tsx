"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { WeeklyGoalProgress } from "@/lib/types";
import WeeklyProgress from "./WeeklyProgress";

interface Props {
  onAdded: () => void;
  userId: string;
  refreshKey?: number;
  heatmap: Record<string, number>;
  goal: WeeklyGoalProgress | null;
}

export default function AddEntryForm({ onAdded, userId, refreshKey, heatmap, goal }: Props) {
  const [topic, setTopic] = useState("");
  const [resource, setResource] = useState("");
  const [existingTopics, setExistingTopics] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    async function load() {
      const topics = await api.get<string[]>(`/api/entries/topics?userId=${userId}`);
      setExistingTopics(topics);
    }
    load();
  }, [userId, refreshKey]);

  const filtered = existingTopics.filter((t) =>
    t.toLowerCase().includes(topic.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !resource.trim()) return;
    await api.post("/api/entries", { topic, resource });
    setTopic("");
    setResource("");
    setShowSuggestions(false);
    onAdded();
  }

  const canSubmit = topic.trim() && resource.trim();

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "24px", boxShadow: "var(--shadow-sm)" }}
    >
      <h2 className="text-base font-semibold mb-5 flex items-center gap-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
        <span style={{ color: "var(--accent)" }}>+</span> Log Study Session
      </h2>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="relative">
          <label className="block text-[12.5px] font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => { setTopic(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="e.g. Load Balancing"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
            style={{ fontFamily: "var(--font-body)", background: "var(--card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}
            onFocusCapture={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-dim)"; }}
            onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          <p className="text-[11.5px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>The concept or pattern you studied</p>
          {showSuggestions && topic && filtered.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg overflow-hidden" style={{ background: "var(--card-elevated)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-md)" }}>
              {filtered.slice(0, 5).map((t) => (
                <button
                  key={t}
                  type="button"
                  onMouseDown={() => { setTopic(t); setShowSuggestions(false); }}
                  className="w-full text-left px-3.5 py-2 text-sm transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-[12.5px] font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Resource</label>
          <input
            type="text"
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            placeholder="e.g. System Design Interview by Alex Xu, Ch. 3"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
            style={{ fontFamily: "var(--font-body)", background: "var(--card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-dim)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          <p className="text-[11.5px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>Where you learned it (book, video, article)</p>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all cursor-pointer disabled:cursor-not-allowed"
          style={{ fontFamily: "var(--font-body)", background: canSubmit ? "var(--accent)" : "var(--card-elevated)", color: canSubmit ? "var(--bg)" : "var(--text-tertiary)", border: canSubmit ? "1px solid var(--accent)" : "1px solid var(--border)" }}
          onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.boxShadow = "0 0 0 4px var(--accent-dim)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
        >
          Add Entry
        </button>

        <WeeklyProgress heatmap={heatmap} goal={goal} onGoalChanged={onAdded} />
      </form>
    </div>
  );
}
