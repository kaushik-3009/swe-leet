"use client";

import { useRef } from "react";
import type { Editor, TLGeoShapeProps } from "tldraw";
import { createShapeId, toRichText } from "tldraw";
import type { DiagramType } from "@/lib/types";

interface ShapeTemplate {
  label: string;
  color: TLGeoShapeProps["color"];
  geo?: TLGeoShapeProps["geo"];
  fill?: TLGeoShapeProps["fill"];
}

// Common building blocks for system-architecture diagrams, distinct shapes/colors so a
// glance at the canvas tells components apart without reading every label.
const ARCHITECTURE_TEMPLATES: ShapeTemplate[] = [
  { label: "Client", color: "grey", geo: "rectangle" },
  { label: "API Gateway", color: "blue", geo: "rectangle" },
  { label: "Load Balancer", color: "violet", geo: "hexagon" },
  { label: "Service", color: "green", geo: "rectangle" },
  { label: "Cache", color: "orange", geo: "rectangle" },
  { label: "Queue", color: "yellow", geo: "hexagon" },
  { label: "Database", color: "light-blue", geo: "ellipse" },
  { label: "CDN", color: "red", geo: "cloud" },
];

// A sequence-style exchange is still expressed as our box+arrow graph model (no true
// lifeline notation), so the palette mostly reuses actor-style boxes for that context.
const SEQUENCE_TEMPLATES: ShapeTemplate[] = [
  { label: "Client", color: "grey", geo: "rectangle" },
  { label: "Server", color: "blue", geo: "rectangle" },
  { label: "Database", color: "light-blue", geo: "ellipse" },
  { label: "External Service", color: "orange", geo: "rectangle" },
];

const CLASS_TEMPLATES: ShapeTemplate[] = [
  { label: "Class", color: "blue", geo: "rectangle" },
  { label: "Interface", color: "violet", geo: "rectangle" },
  { label: "Abstract Class", color: "orange", geo: "rectangle" },
  { label: "Enum", color: "green", geo: "rectangle" },
];

const TEMPLATES_BY_TYPE: Record<DiagramType, ShapeTemplate[]> = {
  ARCHITECTURE: ARCHITECTURE_TEMPLATES,
  SEQUENCE: SEQUENCE_TEMPLATES,
  CLASS: CLASS_TEMPLATES,
};

interface Props {
  editor: Editor | null;
  diagramType: DiagramType;
}

export default function ArchitectureShapePalette({ editor, diagramType }: Props) {
  const placeCountRef = useRef(0);

  function insert(t: ShapeTemplate) {
    if (!editor) return;
    const bounds = editor.getViewportPageBounds();
    const n = placeCountRef.current++;
    const col = n % 4;
    const row = Math.floor(n / 4);
    const x = bounds.x + bounds.w * 0.15 + col * 190;
    const y = bounds.y + bounds.h * 0.15 + row * 110;

    editor.createShape({
      id: createShapeId(),
      type: "geo",
      x,
      y,
      props: {
        geo: t.geo ?? "rectangle",
        w: 160,
        h: 70,
        color: t.color,
        fill: t.fill ?? "solid",
        labelColor: "black",
        align: "middle",
        verticalAlign: "middle",
        font: "draw",
        richText: toRichText(t.label),
      },
    });
  }

  const templates = TEMPLATES_BY_TYPE[diagramType];

  return (
    <div className="flex flex-wrap gap-1.5">
      {templates.map((t) => (
        <button
          key={t.label}
          onClick={() => insert(t)}
          disabled={!editor}
          className="text-[11.5px] px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: "var(--font-display)", background: "var(--card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { if (editor) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          title={`Add a "${t.label}" shape to the canvas`}
        >
          + {t.label}
        </button>
      ))}
    </div>
  );
}
