// Minimal renderer for the markdown subset used across problem descriptions, reference
// explanations, and topic articles: headers (##/###), fenced code blocks, bullet and
// numbered lists, and **bold**/`inline code`. Deliberately hand-rolled (no external
// markdown library) to keep bundle size down for a small, fixed set of authoring needs.
function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded text-[0.9em]"
          style={{ fontFamily: "var(--font-display)", background: "var(--card-elevated)", border: "1px solid var(--border)" }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      i++;
      continue;
    }

    // Fenced code block.
    if (line.startsWith("```")) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre
          key={key++}
          className="rounded-lg px-4 py-3 overflow-x-auto text-[12.5px] leading-relaxed"
          style={{ fontFamily: "var(--font-display)", background: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Headers.
    const headerMatch = /^(#{2,4})\s+(.*)$/.exec(line);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const sizeClass = level === 2 ? "text-[15px] mt-5 first:mt-0" : level === 3 ? "text-[13.5px] mt-4" : "text-[12.5px] mt-3";
      blocks.push(
        <div key={key++} className={`font-semibold ${sizeClass}`} style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          {parseInline(headerMatch[2])}
        </div>
      );
      i++;
      continue;
    }

    // A whole line wrapped in ** ** on its own acts as a small uppercase label
    // (legacy convention used by a few shorter, structured explanations).
    if (/^\*\*(.+)\*\*$/.test(line)) {
      blocks.push(
        <div
          key={key++}
          className="text-[11.5px] font-semibold tracking-wider uppercase mt-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
        >
          {line.slice(2, -2)}
        </div>
      );
      i++;
      continue;
    }

    // Bullet list.
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-1">
          {items.map((item, j) => (
            <li key={j}>{parseInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list.
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-5 space-y-1">
          {items.map((item, j) => (
            <li key={j}>{parseInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^#{2,4}\s/.test(lines[i].trim()) &&
      !/^\*\*(.+)\*\*$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("- ") &&
      !/^\d+\.\s/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push(<p key={key++}>{parseInline(paraLines.join(" "))}</p>);
  }

  return (
    <div className="space-y-2.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      {blocks}
    </div>
  );
}
