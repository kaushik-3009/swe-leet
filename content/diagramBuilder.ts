// Builds reference-solution tldraw diagrams headlessly (no DOM/Editor needed), so
// content authors can describe a diagram as a list of boxes + arrows and get back
// a valid tldraw store snapshot to seed as Problem.referenceDiagram.
import { createTLStore, createShapeId, createBindingId, toRichText, PageRecordType, getIndexAbove } from "tldraw";
import type { IndexKey } from "tldraw";

export interface DiagramNodeSpec {
  id: string;
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  geo?: "rectangle" | "ellipse" | "cloud" | "hexagon";
}

export interface DiagramEdgeSpec {
  from: string;
  to: string;
  label?: string;
}

export function buildReferenceDiagram(nodes: DiagramNodeSpec[], edges: DiagramEdgeSpec[]) {
  const store = createTLStore();
  const page = PageRecordType.create({ id: PageRecordType.createId("main"), name: "Reference Solution", index: "a1" as never });
  store.put([page]);

  const shapeIdByName = new Map<string, ReturnType<typeof createShapeId>>();
  let lastIndex: IndexKey | null = null;
  const nextIndex = () => {
    lastIndex = getIndexAbove(lastIndex);
    return lastIndex;
  };

  for (const n of nodes) {
    const shapeId = createShapeId(n.id);
    shapeIdByName.set(n.id, shapeId);
    store.put([
      {
        id: shapeId,
        typeName: "shape",
        type: "geo",
        x: n.x,
        y: n.y,
        rotation: 0,
        index: nextIndex(),
        parentId: page.id,
        isLocked: false,
        opacity: 1,
        props: {
          geo: n.geo ?? "rectangle",
          dash: "solid",
          url: "",
          w: n.w ?? 160,
          h: n.h ?? 70,
          growY: 0,
          scale: 1,
          labelColor: "black",
          color: "black",
          fill: "none",
          size: "m",
          font: "draw",
          align: "middle",
          verticalAlign: "middle",
          richText: toRichText(n.label),
        },
        meta: {},
      } as never,
    ]);
  }

  let edgeIndex = 0;
  for (const e of edges) {
    const fromShape = shapeIdByName.get(e.from);
    const toShape = shapeIdByName.get(e.to);
    if (!fromShape || !toShape) {
      throw new Error(`buildReferenceDiagram: edge references unknown node "${e.from}" -> "${e.to}"`);
    }
    const fromNode = nodes.find((n) => n.id === e.from)!;
    const toNode = nodes.find((n) => n.id === e.to)!;
    const arrowId = createShapeId(`${e.from}-${e.to}-${edgeIndex++}`);

    store.put([
      {
        id: arrowId,
        typeName: "shape",
        type: "arrow",
        x: 0,
        y: 0,
        rotation: 0,
        index: nextIndex(),
        parentId: page.id,
        isLocked: false,
        opacity: 1,
        props: {
          kind: "arc",
          labelColor: "black",
          color: "black",
          fill: "none",
          dash: "solid",
          size: "m",
          arrowheadStart: "none",
          arrowheadEnd: "arrow",
          font: "draw",
          start: { x: fromNode.x + (fromNode.w ?? 160) / 2, y: fromNode.y + (fromNode.h ?? 70) / 2 },
          end: { x: toNode.x + (toNode.w ?? 160) / 2, y: toNode.y + (toNode.h ?? 70) / 2 },
          bend: 0,
          richText: toRichText(e.label ?? ""),
          labelPosition: 0.5,
          scale: 1,
          elbowMidPoint: 0.5,
        },
        meta: {},
      } as never,
    ]);

    store.put([
      {
        id: createBindingId(),
        typeName: "binding",
        type: "arrow",
        fromId: arrowId,
        toId: fromShape,
        props: { terminal: "start", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false, snap: "none" },
        meta: {},
      } as never,
      {
        id: createBindingId(),
        typeName: "binding",
        type: "arrow",
        fromId: arrowId,
        toId: toShape,
        props: { terminal: "end", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false, snap: "none" },
        meta: {},
      } as never,
    ]);
  }

  return store.getStoreSnapshot();
}
