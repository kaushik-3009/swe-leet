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

export function seedDemoData(): void {
  const topics = [
    ["Load Balancing", "System Design Interview by Alex Xu, Ch. 1"],
    ["Caching", "System Design Interview by Alex Xu, Ch. 2"],
    ["Rate Limiting", "Grokking System Design"],
    ["Message Queues", "Designing Data-Intensive Applications, Ch. 11"],
    ["Database Sharding", "System Design Interview by Alex Xu, Ch. 5"],
    ["Consistent Hashing", "Grokking System Design"],
    ["CDN", "System Design Interview by Alex Xu, Ch. 4"],
    ["SQL vs NoSQL", "Designing Data-Intensive Applications, Ch. 2"],
    ["CAP Theorem", "MIT 6.824 Lecture Notes"],
    ["Microservices", "Building Microservices by Sam Newman"],
    ["API Gateway", "System Design Interview by Alex Xu, Ch. 6"],
    ["WebSockets", "Grokking System Design"],
    ["Bloom Filters", "Designing Data-Intensive Applications, Ch. 7"],
    ["Leader Election", "MIT 6.824 Lecture Notes"],
    ["Pub/Sub", "Grokking System Design"],
  ];

  const entries = getEntries();
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const count = Math.random() > 0.4 ? Math.floor(Math.random() * 3) + 1 : 0;
    for (let j = 0; j < count; j++) {
      const [topic, resource] = topics[Math.floor(Math.random() * topics.length)];
      entries.unshift({
        id: crypto.randomUUID(),
        topic,
        resource,
        date: dateStr,
        createdAt: d.getTime(),
      });
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
