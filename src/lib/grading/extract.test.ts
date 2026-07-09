import { describe, it, expect } from "vitest";
import { extractGraph } from "./extract";

function richText(text: string) {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

function snapshotWith(records: Record<string, unknown>) {
  return { document: { store: records } };
}

describe("extractGraph", () => {
  it("returns empty graph for undefined/null/empty snapshot", () => {
    expect(extractGraph(undefined)).toEqual({ nodes: [], edges: [] });
    expect(extractGraph(null)).toEqual({ nodes: [], edges: [] });
    expect(extractGraph({})).toEqual({ nodes: [], edges: [] });
  });

  it("extracts labeled geo/text/note shapes as nodes", () => {
    const snapshot = snapshotWith({
      "shape:a": { id: "shape:a", typeName: "shape", type: "geo", props: { richText: richText("Client") } },
      "shape:b": { id: "shape:b", typeName: "shape", type: "text", props: { richText: richText("Server") } },
      "shape:c": { id: "shape:c", typeName: "shape", type: "note", props: { richText: richText("Cache") } },
      "shape:d": { id: "shape:d", typeName: "shape", type: "geo", props: { richText: richText("") } }, // no label -> skipped
    });
    const graph = extractGraph(snapshot);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes.map((n) => n.label).sort()).toEqual(["Cache", "Client", "Server"]);
  });

  it("ignores unlabeled or unsupported shape types", () => {
    const snapshot = snapshotWith({
      "shape:a": { id: "shape:a", typeName: "shape", type: "frame", props: {} },
      "shape:b": { id: "shape:b", typeName: "shape", type: "draw", props: {} },
    });
    expect(extractGraph(snapshot).nodes).toHaveLength(0);
  });

  it("joins an arrow's start/end bindings into a single edge with the arrow's label", () => {
    const snapshot = snapshotWith({
      "shape:client": { id: "shape:client", typeName: "shape", type: "geo", props: { richText: richText("Client") } },
      "shape:server": { id: "shape:server", typeName: "shape", type: "geo", props: { richText: richText("Server") } },
      "shape:arrow1": { id: "shape:arrow1", typeName: "shape", type: "arrow", props: { richText: richText("HTTP") } },
      "binding:1": { id: "binding:1", typeName: "binding", type: "arrow", fromId: "shape:arrow1", toId: "shape:client", props: { terminal: "start" } },
      "binding:2": { id: "binding:2", typeName: "binding", type: "arrow", fromId: "shape:arrow1", toId: "shape:server", props: { terminal: "end" } },
    });
    const graph = extractGraph(snapshot);
    expect(graph.edges).toEqual([{ from: "shape:client", to: "shape:server", label: "HTTP" }]);
  });

  it("does not produce an edge when only one end of an arrow is bound", () => {
    const snapshot = snapshotWith({
      "shape:client": { id: "shape:client", typeName: "shape", type: "geo", props: { richText: richText("Client") } },
      "shape:arrow1": { id: "shape:arrow1", typeName: "shape", type: "arrow", props: { richText: richText("") } },
      "binding:1": { id: "binding:1", typeName: "binding", type: "arrow", fromId: "shape:arrow1", toId: "shape:client", props: { terminal: "start" } },
    });
    expect(extractGraph(snapshot).edges).toHaveLength(0);
  });

  it("supports a plain {store} snapshot shape (not wrapped in {document})", () => {
    const snapshot = { store: { "shape:a": { id: "shape:a", typeName: "shape", type: "geo", props: { richText: richText("Client") } } } };
    expect(extractGraph(snapshot).nodes).toHaveLength(1);
  });

  it("flattens multi-paragraph rich text into a single space-joined label", () => {
    const richMultiline = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Load" }] }, { type: "paragraph", content: [{ type: "text", text: "Balancer" }] }] };
    const snapshot = snapshotWith({
      "shape:a": { id: "shape:a", typeName: "shape", type: "geo", props: { richText: richMultiline } },
    });
    expect(extractGraph(snapshot).nodes[0].label).toBe("Load Balancer");
  });
});
