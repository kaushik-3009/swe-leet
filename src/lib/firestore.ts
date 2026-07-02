import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  writeBatch as fbWriteBatch,
} from "firebase/firestore";
import { db as getDb } from "./firebase";

export interface StudyEntry {
  id: string;
  topic: string;
  resource: string;
  date: string;
  createdAt: number;
  userId: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: any;
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");
  return db;
}

// ─── Username uniqueness ────────────────────────────────────────────────────────
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const db = requireDb();
  const q = query(collection(db, "users"), where("username", "==", username.toLowerCase().trim()));
  const snapshot = await getDocs(q);
  return snapshot.empty;
}

// ─── Entries ────────────────────────────────────────────────────────────────────
export async function addEntry(userId: string, topic: string, resource: string): Promise<StudyEntry> {
  const db = requireDb();
  const entry = {
    topic: topic.trim(),
    resource: resource.trim(),
    date: new Date().toISOString().split("T")[0],
    createdAt: Date.now(),
    userId,
  };
  const docRef = await addDoc(collection(db, "entries"), entry);
  return { ...entry, id: docRef.id };
}

export async function deleteEntry(entryId: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, "entries", entryId));
}

export async function getUserEntries(userId: string): Promise<StudyEntry[]> {
  const db = requireDb();
  const q = query(
    collection(db, "entries"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StudyEntry));
}

export async function getUserStats(userId: string) {
  const entries = await getUserEntries(userId);
  const topics = [...new Set(entries.map((e) => e.topic))];
  const days = new Set(entries.map((e) => e.date)).size;
  return { totalEntries: entries.length, uniqueTopics: topics.length, studyDays: days, entries, topics };
}

// ─── Heatmap ────────────────────────────────────────────────────────────────────
export function getHeatmapDataFromEntries(entries: StudyEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    counts[entry.date] = (counts[entry.date] || 0) + 1;
  }
  return counts;
}

// ─── Demo data (Firestore) ──────────────────────────────────────────────────────
const DEMO_TOPICS: [string, string][] = [
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

export async function seedDemoDataFirestore(userId: string): Promise<void> {
  const db = requireDb();
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const count = Math.random() > 0.4 ? Math.floor(Math.random() * 3) + 1 : 0;
    for (let j = 0; j < count; j++) {
      const [topic, resource] = DEMO_TOPICS[Math.floor(Math.random() * DEMO_TOPICS.length)];
      await addDoc(collection(db, "entries"), {
        topic,
        resource,
        date: dateStr,
        createdAt: d.getTime() + j,
        userId,
      });
    }
  }
}

export async function clearAllEntriesFirestore(userId: string): Promise<void> {
  const db = requireDb();
  const q = query(collection(db, "entries"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ─── Seed demo users with data ──────────────────────────────────────────────────
export async function seedDemoUsers(): Promise<void> {
  const db = requireDb();
  const demoUsers: { username: string; displayName: string; email: string }[] = [
    { username: "alex_xu", displayName: "Alex Xu", email: "alex@demo.com" },
    { username: "system_design_pro", displayName: "SD Pro", email: "sdpro@demo.com" },
    { username: "grokking_dev", displayName: "Grokking Dev", email: "grok@demo.com" },
    { username: "ddia_reader", displayName: "DDIA Reader", email: "ddia@demo.com" },
    { username: "mit_student", displayName: "MIT Student", email: "mit@demo.com" },
  ];

  for (const u of demoUsers) {
    const uid = `demo_${u.username}`;

    // Create user profile if it doesn't exist
    const existing = await getDoc(doc(db, "users", uid));
    if (!existing.exists()) {
      await setDoc(doc(db, "users", uid), {
        uid,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "usernames", u.username), { uid });
    }

    // Check if this user already has entries
    const existingEntries = await getDocs(
      query(collection(db, "entries"), where("userId", "==", uid))
    );
    if (!existingEntries.empty) continue;

    // Seed entries for this demo user
    const today = new Date();
    const batch = writeBatch(db);
    let batchCount = 0;

    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = Math.random() > 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
      for (let j = 0; j < count; j++) {
        const [topic, resource] = DEMO_TOPICS[Math.floor(Math.random() * DEMO_TOPICS.length)];
        const entryRef = doc(collection(db, "entries"));
        batch.set(entryRef, {
          topic,
          resource,
          date: dateStr,
          createdAt: d.getTime() + j,
          userId: uid,
        });
        batchCount++;

        // Firestore batch limit is 500
        if (batchCount >= 450) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }
}

// ─── User search ────────────────────────────────────────────────────────────────
export async function searchUsers(queryStr: string, excludeUid?: string): Promise<UserProfile[]> {
  const db = requireDb();
  const searchTerm = queryStr.toLowerCase().trim();
  if (!searchTerm) return [];

  const q = query(
    collection(db, "users"),
    where("username", ">=", searchTerm),
    where("username", "<=", searchTerm + "\uf8ff")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => u.uid !== excludeUid);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = requireDb();
  const docSnap = await getDoc(doc(db, "users", uid));
  return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const db = requireDb();
  const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserProfile;
}

// ─── Follow / Unfollow ──────────────────────────────────────────────────────────
export async function followUser(currentUid: string, targetUid: string): Promise<void> {
  const db = requireDb();
  const batch = writeBatch(db);
  batch.set(doc(db, "following", currentUid, "userFollowing", targetUid), { uid: targetUid, followedAt: serverTimestamp() });
  batch.set(doc(db, "followers", targetUid, "userFollowers", currentUid), { uid: currentUid, followedAt: serverTimestamp() });
  await batch.commit();
}

export async function unfollowUser(currentUid: string, targetUid: string): Promise<void> {
  const db = requireDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, "following", currentUid, "userFollowing", targetUid));
  batch.delete(doc(db, "followers", targetUid, "userFollowers", currentUid));
  await batch.commit();
}

export async function isFollowing(currentUid: string, targetUid: string): Promise<boolean> {
  const db = requireDb();
  const docSnap = await getDoc(doc(db, "following", currentUid, "userFollowing", targetUid));
  return docSnap.exists();
}

export async function getFollowers(uid: string): Promise<UserProfile[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, "followers", uid, "userFollowers"));
  const profiles: UserProfile[] = [];
  for (const d of snapshot.docs) {
    const p = await getUserProfile(d.id);
    if (p) profiles.push(p);
  }
  return profiles;
}

export async function getFollowing(uid: string): Promise<UserProfile[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, "following", uid, "userFollowing"));
  const profiles: UserProfile[] = [];
  for (const d of snapshot.docs) {
    const p = await getUserProfile(d.id);
    if (p) profiles.push(p);
  }
  return profiles;
}

export async function getFollowerCount(uid: string): Promise<number> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, "followers", uid, "userFollowers"));
  return snapshot.size;
}

export async function getFollowingCount(uid: string): Promise<number> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, "following", uid, "userFollowing"));
  return snapshot.size;
}
