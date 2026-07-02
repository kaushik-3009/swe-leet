"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.trim() || username.trim().length < 3) {
          setError("Username must be at least 3 characters");
          setLoading(false);
          return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
          setError("Username can only contain letters, numbers, and underscores");
          setLoading(false);
          return;
        }
        await signup(email, password, username);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      const clean = msg
        .replace("Firebase: Error (", "")
        .replace(/\)$/, "")
        .replace("Firebase: ", "");
      setError(clean || msg);
    }
    setLoading(false);
  }

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-md)",
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    background: "var(--card-elevated)",
    border: "1px solid var(--border-strong)",
    color: "var(--text-primary)",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl p-8" style={cardStyle}>
        <div className="text-center mb-8">
          <div
            className="flex items-center justify-center gap-2 mb-3 text-xs tracking-widest uppercase"
            style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }}
            />
            Study Log
          </div>
          <h1
            className="text-2xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {mode === "login"
              ? "Sign in to track your system design progress"
              : "Start tracking your system design journey"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. kaushik_3009"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-dim)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                Others can find and follow you by this name
              </p>
            </div>
          )}

          <div>
            <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-dim)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-dim)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {error && (
            <div
              className="text-sm rounded-lg px-3.5 py-2.5"
              style={{ background: "rgba(220,38,38,0.08)", color: "var(--danger)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
            style={{
              fontFamily: "var(--font-body)",
              background: "var(--accent)",
              color: "var(--bg)",
              border: "1px solid var(--accent)",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.boxShadow = "0 0 0 4px var(--accent-dim)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => { setMode("signup"); setError(""); }}
                className="font-semibold cursor-pointer"
                style={{ color: "var(--accent)" }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="font-semibold cursor-pointer"
                style={{ color: "var(--accent)" }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
