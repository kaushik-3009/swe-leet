// Minimal renderer for the subset of markdown used in problem descriptions and
// reference explanations: paragraphs, **bold**, and "- " bullet lists.
function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

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

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\*\*(.+)\*\*$/.test(lines[i].trim()) && !lines[i].trim().startsWith("- ")) {
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
