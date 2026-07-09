import { buildReferenceDiagram, type DiagramEdgeSpec, type DiagramNodeSpec } from "./diagramBuilder";

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Lays out a simple grid of labeled boxes with arrows between them, derived directly
 * from a problem's rubric so the reference diagram always matches what grading expects. */
export function autoLayoutDiagram(components: string[], connections: { from: string; to: string; label?: string }[]) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(components.length)));
  const nodes: DiagramNodeSpec[] = components.map((label, i) => ({
    id: slugify(label),
    label,
    x: (i % cols) * 230,
    y: Math.floor(i / cols) * 150,
  }));
  const edges: DiagramEdgeSpec[] = connections.map((c) => ({ from: slugify(c.from), to: slugify(c.to), label: c.label }));
  return buildReferenceDiagram(nodes, edges);
}
