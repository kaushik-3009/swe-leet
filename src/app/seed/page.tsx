"use client";

import { useState } from "react";
import { seedDemoUsers } from "@/lib/firestore";

export default function SeedPage() {
  const [status, setStatus] = useState<"idle" | "seeding" | "done" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);

  async function handleSeed() {
    setStatus("seeding");
    setLog(["Starting demo user seeding..."]);
    try {
      await seedDemoUsers();
      setLog((prev) => [...prev, "Done! 5 demo users created with 60 days of data each."]);
      setStatus("done");
    } catch (e: any) {
      setLog((prev) => [...prev, `Error: ${e.message}`]);
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl p-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h1 className="text-xl font-semibold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Seed Demo Users
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Creates 5 demo users with 60 days of study data each. Skips users that already exist.
        </p>
        <button
          onClick={handleSeed}
          disabled={status === "seeding" || status === "done"}
          className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          style={{
            fontFamily: "var(--font-body)",
            background: status === "done" ? "var(--card-elevated)" : "var(--accent)",
            color: status === "done" ? "var(--accent)" : "var(--bg)",
            border: status === "done" ? "1px solid var(--accent-dim-border)" : "1px solid var(--accent)",
          }}
        >
          {status === "seeding" ? "Seeding..." : status === "done" ? "Done ✓" : "Seed Demo Users"}
        </button>
        {log.length > 0 && (
          <div className="mt-4 rounded-lg p-3 text-xs" style={{ background: "var(--card-elevated)", border: "1px solid var(--border)", fontFamily: "var(--font-display)", color: "var(--text-secondary)" }}>
            {log.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
