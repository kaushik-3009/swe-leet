"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import type { UserProfile, StudyEntry, CategoryWithProgress, SolvedProblemSummary } from "@/lib/types";
import Link from "next/link";
import { ActivityHeatmapMonth } from "react-activity-heatmap";
import type { HeatmapActivity } from "react-activity-heatmap";

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { user, profile: currentProfile } = useAuth();

  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<StudyEntry[]>([]);
  const [stats, setStats] = useState({ totalEntries: 0, uniqueTopics: 0, studyDays: 0 });
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<HeatmapActivity[]>([]);
  const [showModal, setShowModal] = useState<"followers" | "following" | null>(null);
  const [modalUsers, setModalUsers] = useState<UserProfile[]>([]);
  const [roadmapCategories, setRoadmapCategories] = useState<CategoryWithProgress[]>([]);
  const [solvedProblems, setSolvedProblems] = useState<SolvedProblemSummary[]>([]);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isOwnProfile = currentProfile?.username === username;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const profile = await api.get<UserProfile | null>(`/api/users/${username}`).catch(() => null);
        if (!profile) { setLoading(false); return; }
        setViewedProfile(profile);

        const userEntries = await api.get<StudyEntry[]>(`/api/entries?userId=${profile.uid}`);
        setEntries(userEntries);

        const topics = [...new Set(userEntries.map((e) => e.topic))];
        const days = new Set(userEntries.map((e) => e.date)).size;
        setStats({ totalEntries: userEntries.length, uniqueTopics: topics.length, studyDays: days });

        const heatmapData: Record<string, number> = {};
        for (const e of userEntries) heatmapData[e.date] = (heatmapData[e.date] || 0) + 1;
        const acts: HeatmapActivity[] = Object.entries(heatmapData).map(([date, count]) => ({
          date: new Date(date + "T12:00:00"),
          count,
          level: getLevel(count),
        }));
        setActivities(acts);

        try {
          const counts = await api.get<{ followers: number; following: number }>(`/api/follow/counts?userId=${profile.uid}`);
          setFollowerCount(counts.followers);
          setFollowingCount(counts.following);
        } catch (e) {
          console.error("Failed to load follow counts:", e);
        }

        try {
          // Roadmap structure is shared; per-user solved status comes from /api/progress
          // (public, keyed by the *viewed* profile's uid — not the logged-in viewer's).
          const [roadmap, solved] = await Promise.all([
            api.get<CategoryWithProgress[]>(`/api/roadmap`),
            api.get<SolvedProblemSummary[]>(`/api/progress?userId=${profile.uid}`),
          ]);
          setRoadmapCategories(roadmap);
          setSolvedProblems(solved);
        } catch (e) {
          console.error("Failed to load roadmap progress:", e);
        }

        if (user && !isOwnProfile) {
          try {
            const { following: f } = await api.get<{ following: boolean }>(`/api/follow/status?targetUid=${profile.uid}`);
            setFollowing(f);
          } catch (e) {
            console.error("Failed to check following:", e);
          }
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      }
      setLoading(false);
    }
    load();
  }, [username, user, isOwnProfile]);

  useEffect(() => {
    if (loading) return;
    function updateScale() {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;
      const containerWidth = container.offsetWidth;
      const contentWidth = content.scrollWidth;
      setScale(Math.min(1, containerWidth / contentWidth));
    }
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading, activities]);

  async function handleFollow() {
    if (!user || !viewedProfile) return;
    try {
      await api.post("/api/follow", { targetUid: viewedProfile.uid });
      setFollowing(true);
      setFollowerCount((c) => c + 1);
    } catch (e) {
      console.error("Failed to follow:", e);
    }
  }

  async function handleUnfollow() {
    if (!user || !viewedProfile) return;
    try {
      await api.delete("/api/follow", { targetUid: viewedProfile.uid });
      setFollowing(false);
      setFollowerCount((c) => c - 1);
    } catch (e) {
      console.error("Failed to unfollow:", e);
    }
  }

  async function openFollowers() {
    if (!viewedProfile) return;
    try {
      const list = await api.get<UserProfile[]>(`/api/follow/followers?userId=${viewedProfile.uid}`);
      setModalUsers(list);
      setShowModal("followers");
    } catch (e) {
      console.error("Failed to load followers:", e);
    }
  }

  async function openFollowing() {
    if (!viewedProfile) return;
    try {
      const list = await api.get<UserProfile[]>(`/api/follow/following?userId=${viewedProfile.uid}`);
      setModalUsers(list);
      setShowModal("following");
    } catch (e) {
      console.error("Failed to load following:", e);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (!viewedProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3" style={{ color: "var(--text-tertiary)" }}>?</div>
          <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>User not found</div>
          <div className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>@{username} doesn&apos;t exist</div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const year = now.getFullYear();
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const statCards = [
    { label: "Total Entries", value: stats.totalEntries, color: "var(--stat-teal)", bg: "var(--stat-teal-bg)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
    { label: "Study Days", value: stats.studyDays, color: "var(--stat-blue)", bg: "var(--stat-blue-bg)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
    { label: "Unique Topics", value: stats.uniqueTopics, color: "var(--stat-amber)", bg: "var(--stat-amber-bg)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.24L4 3a1 1 0 00-1 1l.24 5.59a2 2 0 00.58 1.41l9.59 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg> },
  ];

  const recentEntries = entries.slice(0, 15);
  const grouped = recentEntries.reduce<Record<string, StudyEntry[]>>((acc, entry) => {
    (acc[entry.date] = acc[entry.date] || []).push(entry);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      {isOwnProfile && <Navbar />}
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0" style={{ background: "var(--accent-dim)", color: "var(--accent)", fontFamily: "var(--font-display)" }}>
            {viewedProfile.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {viewedProfile.displayName}
              </h1>
              <span className="text-sm px-2.5 py-0.5 rounded-full w-fit" style={{ fontFamily: "var(--font-display)", background: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-tertiary)" }}>
                @{viewedProfile.username}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              <button onClick={openFollowers} className="cursor-pointer hover:underline">
                <b style={{ color: "var(--text-primary)" }}>{followerCount}</b> followers
              </button>
              <button onClick={openFollowing} className="cursor-pointer hover:underline">
                <b style={{ color: "var(--text-primary)" }}>{followingCount}</b> following
              </button>
            </div>
          </div>
          {!isOwnProfile && user && (
            <button
              onClick={following ? handleUnfollow : handleFollow}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
              style={{ fontFamily: "var(--font-body)", background: following ? "var(--card-elevated)" : "var(--accent)", color: following ? "var(--text-secondary)" : "var(--bg)", border: following ? "1px solid var(--border-strong)" : "1px solid var(--accent)" }}
              onMouseEnter={(e) => { if (!following) e.currentTarget.style.boxShadow = "0 0 0 4px var(--accent-dim)"; if (following) { e.currentTarget.style.borderColor = "var(--danger)"; e.currentTarget.style.color = "var(--danger)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; if (following) { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
            >
              {following ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>

        <div className="space-y-7">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {statCards.map((card) => (
              <div key={card.label} className="relative rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="absolute top-0 left-0 right-0 h-[2px] opacity-80" style={{ background: `linear-gradient(90deg, ${card.color}, transparent 70%)` }} />
                <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 opacity-50" style={{ borderTop: "1px solid var(--border-strong)", borderRight: "1px solid var(--border-strong)" }} />
                <div className="p-5 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-[11px] tracking-wider uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>{card.label}</div>
                    <div className="w-[30px] h-[30px] rounded-md flex items-center justify-center" style={{ background: card.bg, color: card.color }}><div className="w-4 h-4">{card.icon}</div></div>
                  </div>
                  <div className="text-[32px] font-semibold leading-none mb-1.5 tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "24px 26px 20px", boxShadow: "var(--shadow-sm)" }}>
            <h2 className="text-[15px] font-semibold flex items-baseline gap-2.5 mb-5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Activity<span className="text-[13px] font-medium" style={{ color: "var(--accent)" }}>· {MONTHS_LONG[currentMonth]} {year}</span>
            </h2>
            {activities.length > 0 ? (
              <div ref={containerRef} className="overflow-hidden">
                <div ref={contentRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", height: scale < 1 ? `${160 * scale}px` : undefined }}>
                  <div className="flex gap-3">
                    {months.map((m) => (
                      <ActivityHeatmapMonth key={`${m}-${year}`} activities={activities} month={m} year={year} cellStyle={{ borderRadius: "0.2rem" }} monthNameStyle={{ fontWeight: "600", fontSize: "0.7rem", color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }} tooltipStyle={{ border: "1px solid var(--border-strong)", background: "var(--card-elevated)", color: "var(--text-primary)", fontSize: "0.75rem" }} customCellColors={{ level0: "var(--heatmap-0)", level1: "var(--heatmap-1)", level2: "var(--heatmap-2)", level3: "var(--heatmap-3)", level4: "var(--heatmap-4)" }} monthNameFormat="short" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm py-8 text-center" style={{ color: "var(--text-tertiary)" }}>No activity yet</div>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
              Less<span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-0)" }} /><span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-1)" }} /><span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-2)" }} /><span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-3)" }} /><span className="w-[11px] h-[11px] rounded-sm" style={{ background: "var(--heatmap-4)" }} />More
            </div>
          </div>

          <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
            <h2 className="text-base font-semibold mb-5 flex items-center gap-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              <span style={{ color: "var(--accent)" }}>·</span> Recent Sessions
            </h2>
            {recentEntries.length === 0 ? (
              <div className="text-sm py-8 text-center" style={{ color: "var(--text-tertiary)" }}>No sessions logged yet</div>
            ) : (
              <div className="space-y-5">
                {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayEntries]) => (
                  <div key={date}>
                    <div className="text-[10.5px] tracking-wider uppercase mb-2 font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
                      {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <div className="space-y-2">
                      {dayEntries.map((entry) => (
                        <div key={entry.id} className="rounded-lg px-3.5 py-3" style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}>
                          <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{entry.topic}</div>
                          <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{entry.resource}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {solvedProblems.length > 0 && (
            <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
              <h2 className="text-base font-semibold mb-5 flex items-center gap-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                <span style={{ color: "var(--accent)" }}>·</span> Roadmap Progress
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {roadmapCategories
                  .map((cat) => {
                    const solvedIds = new Set(solvedProblems.filter((s) => s.status === "SOLVED").map((s) => s.problemId));
                    const solvedCount = cat.problems.filter((p) => solvedIds.has(p.id)).length;
                    const pct = cat.problems.length === 0 ? 0 : Math.round((solvedCount / cat.problems.length) * 100);
                    return { ...cat, viewerPct: pct, solvedCount };
                  })
                  .filter((cat) => cat.problems.length > 0)
                  .map((cat) => (
                    <div key={cat.id} className="rounded-lg px-3.5 py-3" style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{cat.title}</span>
                        <span className="text-xs" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>{cat.viewerPct}%</span>
                      </div>
                      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${cat.viewerPct}%`, background: "linear-gradient(90deg, #157a5c, var(--accent))" }} />
                      </div>
                    </div>
                  ))}
              </div>

              <h3 className="text-[11px] tracking-wider uppercase mb-3 font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
                Solved Problems
              </h3>
              <div className="flex flex-wrap gap-2">
                {solvedProblems.filter((s) => s.status === "SOLVED").map((s) => (
                  <Link
                    key={s.problemId}
                    href={`/practice/${s.slug}`}
                    className="text-xs px-2.5 py-1.5 rounded-full transition-colors"
                    style={{ fontFamily: "var(--font-display)", color: "var(--accent)", background: "var(--accent-dim)", border: "1px solid var(--accent-dim-border)" }}
                  >
                    {s.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowModal(null)}>
          <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {showModal === "followers" ? "Followers" : "Following"}
              </h3>
              <button onClick={() => setShowModal(null)} className="cursor-pointer text-lg" style={{ color: "var(--text-tertiary)" }}>✕</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {modalUsers.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                  {showModal === "followers" ? "No followers yet" : "Not following anyone yet"}
                </div>
              ) : (
                modalUsers.map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => { setShowModal(null); router.push(`/user/${u.username}`); }}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 transition-colors cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{u.displayName}</div>
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>@{u.username}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
