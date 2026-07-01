export interface StudyEntry {
  id: string;
  topic: string;
  resource: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

const STORAGE_KEY = "sd-tracker-entries";

export function getEntries(): StudyEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addEntry(topic: string, resource: string): StudyEntry {
  const entries = getEntries();
  const entry: StudyEntry = {
    id: crypto.randomUUID(),
    topic: topic.trim(),
    resource: resource.trim(),
    date: new Date().toISOString().split("T")[0],
    createdAt: Date.now(),
  };
  entries.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entry;
}

export function deleteEntry(id: string): void {
  const entries = getEntries().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getHeatmapData(): Record<string, number> {
  const entries = getEntries();
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    counts[entry.date] = (counts[entry.date] || 0) + 1;
  }
  return counts;
}

export function getTopicsStudied(): string[] {
  const entries = getEntries();
  return [...new Set(entries.map((e) => e.topic))].sort();
}

export function getTotalEntries(): number {
  return getEntries().length;
}

export function getStudyDays(): number {
  const entries = getEntries();
  return new Set(entries.map((e) => e.date)).size;
}
