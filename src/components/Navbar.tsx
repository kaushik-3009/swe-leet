"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { api } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const users = await api.get<UserProfile[]>(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        setResults(users);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }}
          />
          <span className="text-sm font-semibold hidden sm:inline">SD Tracker</span>
        </Link>

        <Link
          href="/study-plan"
          className="text-sm font-medium shrink-0 hidden md:inline transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          Study Plan
        </Link>

        <Link
          href="/roadmap"
          className="text-sm font-medium shrink-0 hidden md:inline transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          Roadmap
        </Link>

        <div className="flex-1 max-w-sm relative" ref={searchRef}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--text-tertiary)" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearch(true);
              }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search users by username..."
              className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none transition-all"
              style={{
                fontFamily: "var(--font-body)",
                background: "var(--card-elevated)",
                border: "1px solid var(--border-strong)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          {showSearch && results.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border-strong)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              {results.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => {
                    router.push(`/user/${u.username}`);
                    setSearchQuery("");
                    setShowSearch(false);
                  }}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors cursor-pointer"
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-elevated)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                  >
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {u.displayName}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      @{u.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showSearch && searchQuery && results.length === 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-lg px-4 py-3 text-sm z-50"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border-strong)",
                boxShadow: "var(--shadow-md)",
                color: "var(--text-tertiary)",
              }}
            >
              No users found
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggle}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer"
            style={{
              background: "var(--card-elevated)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-secondary)",
            }}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          <Link
            href={`/user/${profile?.username}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-primary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-elevated)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              {profile?.username?.charAt(0).toUpperCase() || "?"}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{profile?.displayName}</span>
          </Link>

          <button
            onClick={logout}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            style={{
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
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
