/**
 * One-time migration: copies user profiles, study entries, and the follow graph
 * from Firestore into Postgres. Idempotent — safe to re-run (upserts by id).
 *
 * Usage: npx tsx scripts/migrate-firestore-to-postgres.ts
 * Requires: FIREBASE_ADMIN_* env vars (service account) and DATABASE_URL.
 */
import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { prisma } from "../src/lib/db";

function initFirestore() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY");
  }
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore(app);
}

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return new Date();
}

const ENTRY_PAGE_SIZE = 500;

async function migrateUsers(db: FirebaseFirestore.Firestore) {
  const snapshot = await db.collection("users").get();
  let migrated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    await prisma.user.upsert({
      where: { id: doc.id },
      create: {
        id: doc.id,
        username: String(data.username ?? doc.id).toLowerCase(),
        displayName: String(data.displayName ?? data.username ?? doc.id),
        email: String(data.email ?? ""),
        createdAt: toDate(data.createdAt),
      },
      update: {
        username: String(data.username ?? doc.id).toLowerCase(),
        displayName: String(data.displayName ?? data.username ?? doc.id),
        email: String(data.email ?? ""),
      },
    });
    migrated++;
  }
  return migrated;
}

async function migrateEntries(db: FirebaseFirestore.Firestore) {
  let migrated = 0;
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db.collection("entries").orderBy("__name__").limit(ENTRY_PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userExists = await prisma.user.findUnique({ where: { id: String(data.userId) }, select: { id: true } });
      if (!userExists) continue; // orphaned entry (deleted user) — skip

      await prisma.studyEntry.upsert({
        where: { id: doc.id },
        create: {
          id: doc.id,
          userId: String(data.userId),
          topic: String(data.topic ?? ""),
          resource: String(data.resource ?? ""),
          date: String(data.date ?? ""),
          createdAt: toDate(data.createdAt),
          kind: "manual",
        },
        update: {
          topic: String(data.topic ?? ""),
          resource: String(data.resource ?? ""),
          date: String(data.date ?? ""),
        },
      });
      migrated++;
    }

    last = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < ENTRY_PAGE_SIZE) break;
  }
  return migrated;
}

async function migrateFollows(db: FirebaseFirestore.Firestore) {
  const snapshot = await db.collectionGroup("userFollowing").get();
  let migrated = 0;
  for (const doc of snapshot.docs) {
    const followerId = doc.ref.parent.parent?.id;
    const followingId = doc.id;
    if (!followerId || !followingId) continue;

    const [followerExists, followingExists] = await Promise.all([
      prisma.user.findUnique({ where: { id: followerId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: followingId }, select: { id: true } }),
    ]);
    if (!followerExists || !followingExists) continue;

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId, createdAt: toDate(doc.data().followedAt) },
      update: {},
    });
    migrated++;
  }
  return migrated;
}

async function main() {
  console.log("Connecting to Firestore...");
  const db = initFirestore();

  console.log("Migrating users...");
  const userCount = await migrateUsers(db);
  console.log(`  -> ${userCount} users migrated`);

  console.log("Migrating study entries (paginated)...");
  const entryCount = await migrateEntries(db);
  console.log(`  -> ${entryCount} entries migrated`);

  console.log("Migrating follow graph...");
  const followCount = await migrateFollows(db);
  console.log(`  -> ${followCount} follow relationships migrated`);

  console.log("\nVerifying counts against Postgres...");
  const [pgUsers, pgEntries, pgFollows] = await Promise.all([
    prisma.user.count(),
    prisma.studyEntry.count(),
    prisma.follow.count(),
  ]);
  console.log(`  Postgres users: ${pgUsers}`);
  console.log(`  Postgres entries: ${pgEntries}`);
  console.log(`  Postgres follows: ${pgFollows}`);

  console.log("\nMigration complete.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
