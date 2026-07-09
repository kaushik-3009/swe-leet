// Parses a tldraw editor snapshot (JSON, as returned by `editor.store.getSnapshot()`
// / `getSnapshot(store)`) into a plain node/edge graph, without depending on the
// tldraw Editor runtime — this only walks the serialized record dictionary, so it
// can run in a server (grading) context with no DOM.

export interface ExtractedNode {
  id: string;
  label: string;
}

export interface ExtractedEdge {
  from: string;
  to: string;
  label: string;
}

export interface ExtractedGraph {
  nodes: ExtractedNode[];
  edges: ExtractedEdge[];
}

interface RichTextNode {
  text?: string;
  content?: RichTextNode[];
}

function plainTextFromRichText(richText: unknown): string {
  if (!richText || typeof richText !== "object") return "";
  const node = richText as RichTextNode;
  const parts: string[] = [];
  if (typeof node.text === "string") parts.push(node.text);
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const t = plainTextFromRichText(child);
      if (t) parts.push(t);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

interface TldrawRecord {
  id: string;
  typeName: string;
  type?: string;
  fromId?: string;
  toId?: string;
  props?: { richText?: unknown; terminal?: "start" | "end" };
}

function getRecords(snapshot: unknown): TldrawRecord[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const s = snapshot as { document?: { store?: Record<string, unknown> }; store?: Record<string, unknown> };
  const store = s.document?.store ?? s.store ?? {};
  return Object.values(store) as TldrawRecord[];
}

const LABEL_SHAPE_TYPES = new Set(["geo", "text", "note"]);

export function extractGraph(snapshot: unknown): ExtractedGraph {
  const records = getRecords(snapshot);

  const nodes: ExtractedNode[] = [];
  const arrowLabels = new Map<string, string>();
  const bindingsByArrow = new Map<string, { start?: string; end?: string }>();

  for (const r of records) {
    if (r.typeName === "shape" && r.type && LABEL_SHAPE_TYPES.has(r.type)) {
      const label = plainTextFromRichText(r.props?.richText);
      if (label) nodes.push({ id: r.id, label });
    } else if (r.typeName === "shape" && r.type === "arrow") {
      const label = plainTextFromRichText(r.props?.richText);
      if (label) arrowLabels.set(r.id, label);
    } else if (r.typeName === "binding" && r.type === "arrow" && r.fromId && r.toId) {
      const entry = bindingsByArrow.get(r.fromId) ?? {};
      if (r.props?.terminal === "start") entry.start = r.toId;
      if (r.props?.terminal === "end") entry.end = r.toId;
      bindingsByArrow.set(r.fromId, entry);
    }
  }

  const edges: ExtractedEdge[] = [];
  for (const [arrowId, { start, end }] of bindingsByArrow) {
    if (start && end) edges.push({ from: start, to: end, label: arrowLabels.get(arrowId) ?? "" });
  }

  return { nodes, edges };
}
