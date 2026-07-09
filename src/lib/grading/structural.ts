import type { ExtractedGraph } from "./extract";
import type { Rubric } from "@/lib/types";

export interface StructuralMatchResult {
  matchedComponents: string[];
  missingComponents: string[];
  matchedConnections: string[]; // "A -> B"
  missingConnections: string[]; // "A -> B"
  coverage: number; // 0-100
}

// Common abbreviations / phrasing seen in hand-drawn designs, mapped to a canonical form.
const SYNONYMS: Record<string, string> = {
  lb: "load balancer",
  "load balancer": "load balancer",
  db: "database",
  database: "database",
  cdn: "cdn",
  "content delivery network": "cdn",
  cache: "cache",
  redis: "cache",
  memcached: "cache",
  queue: "message queue",
  mq: "message queue",
  "message queue": "message queue",
  kafka: "message queue",
  "api gateway": "api gateway",
  gateway: "api gateway",
  client: "client",
  user: "client",
  server: "application server",
  "app server": "application server",
  "application server": "application server",
  "web server": "application server",
  shard: "shard",
  sharding: "shard",
  replica: "replica",
  "read replica": "replica",
};

function normalize(label: string): string {
  const s = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return SYNONYMS[s] ?? s;
}

function labelsMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

export function matchStructural(graph: ExtractedGraph, rubric: Rubric): StructuralMatchResult {
  const matchedComponents: string[] = [];
  const missingComponents: string[] = [];

  for (const required of rubric.requiredComponents) {
    const found = graph.nodes.some((n) => labelsMatch(n.label, required));
    (found ? matchedComponents : missingComponents).push(required);
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const matchedConnections: string[] = [];
  const missingConnections: string[] = [];

  for (const conn of rubric.requiredConnections) {
    const label = `${conn.from} -> ${conn.to}`;
    const found = graph.edges.some((e) => {
      const fromNode = nodeById.get(e.from);
      const toNode = nodeById.get(e.to);
      return !!fromNode && !!toNode && labelsMatch(fromNode.label, conn.from) && labelsMatch(toNode.label, conn.to);
    });
    (found ? matchedConnections : missingConnections).push(label);
  }

  const total = rubric.requiredComponents.length + rubric.requiredConnections.length;
  const matched = matchedComponents.length + matchedConnections.length;
  const coverage = total === 0 ? 100 : Math.round((matched / total) * 100);

  return { matchedComponents, missingComponents, matchedConnections, missingConnections, coverage };
}
