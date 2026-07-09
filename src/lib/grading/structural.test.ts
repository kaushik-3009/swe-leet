import { describe, it, expect } from "vitest";
import { matchStructural } from "./structural";
import type { ExtractedGraph } from "./extract";
import type { Rubric } from "@/lib/types";

function graph(nodes: { id: string; label: string }[], edges: { from: string; to: string; label?: string }[] = []): ExtractedGraph {
  return { nodes, edges: edges.map((e) => ({ label: "", ...e })) };
}

describe("matchStructural", () => {
  it("matches components exactly", () => {
    const rubric: Rubric = { requiredComponents: ["Client", "Server"], requiredConnections: [] };
    const result = matchStructural(graph([{ id: "1", label: "Client" }, { id: "2", label: "Server" }]), rubric);
    expect(result.matchedComponents).toEqual(["Client", "Server"]);
    expect(result.missingComponents).toEqual([]);
    expect(result.coverage).toBe(100);
  });

  it("reports missing components not present in the graph", () => {
    const rubric: Rubric = { requiredComponents: ["Client", "Database"], requiredConnections: [] };
    const result = matchStructural(graph([{ id: "1", label: "Client" }]), rubric);
    expect(result.matchedComponents).toEqual(["Client"]);
    expect(result.missingComponents).toEqual(["Database"]);
    expect(result.coverage).toBe(50);
  });

  it("matches known synonyms (LB -> Load Balancer, DB -> Database)", () => {
    const rubric: Rubric = { requiredComponents: ["Load Balancer", "Database"], requiredConnections: [] };
    const result = matchStructural(graph([{ id: "1", label: "LB" }, { id: "2", label: "DB" }]), rubric);
    expect(result.matchedComponents).toEqual(["Load Balancer", "Database"]);
    expect(result.coverage).toBe(100);
  });

  it("matches case-insensitively and via substring containment", () => {
    const rubric: Rubric = { requiredComponents: ["Rate Limiter Service"], requiredConnections: [] };
    const result = matchStructural(graph([{ id: "1", label: "rate limiter" }]), rubric);
    expect(result.matchedComponents).toEqual(["Rate Limiter Service"]);
  });

  it("does not match unrelated labels", () => {
    const rubric: Rubric = { requiredComponents: ["Database"], requiredConnections: [] };
    const result = matchStructural(graph([{ id: "1", label: "Client" }]), rubric);
    expect(result.matchedComponents).toEqual([]);
    expect(result.missingComponents).toEqual(["Database"]);
  });

  it("matches a required connection only when both endpoints and the edge exist", () => {
    const rubric: Rubric = {
      requiredComponents: ["Client", "Server"],
      requiredConnections: [{ from: "Client", to: "Server" }],
    };
    const g = graph(
      [{ id: "c", label: "Client" }, { id: "s", label: "Server" }],
      [{ from: "c", to: "s" }]
    );
    const result = matchStructural(g, rubric);
    expect(result.matchedConnections).toEqual(["Client -> Server"]);
    expect(result.missingConnections).toEqual([]);
    expect(result.coverage).toBe(100);
  });

  it("reports a missing connection when the edge is absent even if both nodes exist", () => {
    const rubric: Rubric = {
      requiredComponents: ["Client", "Server"],
      requiredConnections: [{ from: "Client", to: "Server" }],
    };
    const g = graph([{ id: "c", label: "Client" }, { id: "s", label: "Server" }], []);
    const result = matchStructural(g, rubric);
    expect(result.missingConnections).toEqual(["Client -> Server"]);
    expect(result.coverage).toBe(Math.round((2 / 3) * 100));
  });

  it("does not match a connection drawn in the reverse direction", () => {
    const rubric: Rubric = {
      requiredComponents: ["Client", "Server"],
      requiredConnections: [{ from: "Client", to: "Server" }],
    };
    const g = graph(
      [{ id: "c", label: "Client" }, { id: "s", label: "Server" }],
      [{ from: "s", to: "c" }] // reversed
    );
    const result = matchStructural(g, rubric);
    expect(result.missingConnections).toEqual(["Client -> Server"]);
  });

  it("returns 100% coverage for an empty rubric regardless of the graph", () => {
    const rubric: Rubric = { requiredComponents: [], requiredConnections: [] };
    expect(matchStructural(graph([]), rubric).coverage).toBe(100);
  });

  it("returns 0% coverage when nothing in the rubric is matched", () => {
    const rubric: Rubric = { requiredComponents: ["Database"], requiredConnections: [{ from: "Database", to: "Cache" }] };
    const result = matchStructural(graph([]), rubric);
    expect(result.coverage).toBe(0);
  });
});
