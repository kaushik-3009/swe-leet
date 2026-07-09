import type { CategorySpec } from "./schema";

export const categories: CategorySpec[] = [
  // ─── System Design (foundational -> advanced) ─────────────────────────────
  {
    slug: "sd-fundamentals",
    track: "SYSTEM_DESIGN",
    title: "Fundamentals",
    description: "Core building blocks every system design answer draws on: rate limiting, key-value lookups, and API gateways.",
    order: 1,
  },
  {
    slug: "sd-caching",
    track: "SYSTEM_DESIGN",
    title: "Caching",
    description: "Reducing read latency and database load with caches, from a single cache layer to CDN edge caching.",
    order: 2,
  },
  {
    slug: "sd-sharding",
    track: "SYSTEM_DESIGN",
    title: "Sharding & Partitioning",
    description: "Scaling storage horizontally: partitioning strategies and consistent hashing.",
    order: 3,
  },
  {
    slug: "sd-consistency",
    track: "SYSTEM_DESIGN",
    title: "Consistency & Consensus",
    description: "Coordinating state across nodes: leader election, distributed locks, and consistency trade-offs.",
    order: 4,
  },
  {
    slug: "sd-messaging",
    track: "SYSTEM_DESIGN",
    title: "Messaging & Streaming",
    description: "Decoupling producers and consumers with queues, pub/sub, and real-time delivery.",
    order: 5,
  },
  {
    slug: "sd-case-studies",
    track: "SYSTEM_DESIGN",
    title: "Case Studies",
    description: "End-to-end designs that combine caching, sharding, messaging, and consistency into one system.",
    order: 6,
  },

  // ─── LLD (foundational -> advanced) ────────────────────────────────────────
  {
    slug: "lld-oo-modeling",
    track: "LLD",
    title: "OO Modeling Fundamentals",
    description: "Translating a real-world domain into classes, relationships, and responsibilities.",
    order: 1,
  },
  {
    slug: "lld-design-patterns",
    track: "LLD",
    title: "Design Patterns",
    description: "Applying classic GoF patterns — Observer, Strategy, Factory — to real interview prompts.",
    order: 2,
  },
  {
    slug: "lld-state-machines",
    track: "LLD",
    title: "State Machines",
    description: "Modeling entities whose behavior depends on discrete states and transitions.",
    order: 3,
  },
  {
    slug: "lld-concurrency",
    track: "LLD",
    title: "Concurrency Patterns",
    description: "Designing thread-safe components: bounded buffers, locks, and in-process rate limiting.",
    order: 4,
  },
  {
    slug: "lld-case-studies",
    track: "LLD",
    title: "Case Studies",
    description: "Larger multi-class systems that combine modeling, patterns, state, and concurrency.",
    order: 5,
  },
];
