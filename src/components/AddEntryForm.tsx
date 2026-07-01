"use client";

import { useState, useEffect } from "react";
import { addEntry, getTopicsStudied } from "@/lib/storage";

interface Props {
  onAdded: () => void;
}

export default function AddEntryForm({ onAdded }: Props) {
  const [topic, setTopic] = useState("");
  const [resource, setResource] = useState("");
  const [existingTopics, setExistingTopics] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setExistingTopics(getTopicsStudied());
  }, []);

  const filtered = existingTopics.filter((t) =>
    t.toLowerCase().includes(topic.toLowerCase())
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !resource.trim()) return;
    addEntry(topic, resource);
    setTopic("");
    setResource("");
    setShowSuggestions(false);
    setExistingTopics(getTopicsStudied());
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-5 sm:p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Log Study Session</h2>
      <div className="space-y-4 mb-4">
        <div className="relative">
          <label className="block text-sm text-gray-400 mb-1">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="e.g. Load Balancing"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {showSuggestions && topic && filtered.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
              {filtered.slice(0, 5).map((t) => (
                <button
                  key={t}
                  type="button"
                  onMouseDown={() => {
                    setTopic(t);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Resource</label>
          <input
            type="text"
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            placeholder="e.g. System Design Interview by Alex Xu, Ch. 3"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!topic.trim() || !resource.trim()}
        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        Add Entry
      </button>
    </form>
  );
}
