import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUidFromRequest } from "@/lib/auth-server";
import { ok, toErrorResponse } from "@/lib/api-response";

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

const DEMO_USERS = [
  { username: "alex_xu", displayName: "Alex Xu", email: "alex@demo.com" },
  { username: "system_design_pro", displayName: "SD Pro", email: "sdpro@demo.com" },
  { username: "grokking_dev", displayName: "Grokking Dev", email: "grok@demo.com" },
  { username: "ddia_reader", displayName: "DDIA Reader", email: "ddia@demo.com" },
  { username: "mit_student", displayName: "MIT Student", email: "mit@demo.com" },
];

function randomEntries(uid: string, days: number, chance: number) {
  const today = new Date();
  const data: { userId: string; topic: string; resource: string; date: string; createdAt: Date }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = Math.random() > chance ? Math.floor(Math.random() * 3) + 1 : 0;
    for (let j = 0; j < count; j++) {
      const [topic, resource] = DEMO_TOPICS[Math.floor(Math.random() * DEMO_TOPICS.length)];
      data.push({ userId: uid, topic, resource, date: dateStr, createdAt: new Date(d.getTime() + j) });
    }
  }
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);

    for (const u of DEMO_USERS) {
      const demoUid = `demo_${u.username}`;
      const user = await prisma.user.upsert({
        where: { id: demoUid },
        create: { id: demoUid, username: u.username, displayName: u.displayName, email: u.email },
        update: {},
      });
      const existingCount = await prisma.studyEntry.count({ where: { userId: user.id } });
      if (existingCount === 0) {
        await prisma.studyEntry.createMany({ data: randomEntries(user.id, 60, 0.3) });
      }
    }

    await prisma.studyEntry.createMany({ data: randomEntries(uid, 30, 0.4) });

    return ok({ seeded: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
