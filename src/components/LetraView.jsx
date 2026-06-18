import { isSectionMarkerLine } from "../lib/transpose.js";

function shouldJustify(line) {
  const t = line.trim();
  if (!t || isSectionMarkerLine(line)) return false;
  if (/^Pe\s*:/i.test(t) || /^T\s*:/i.test(t)) return false;
  return t.length >= 28 || t.split(/\s+/).filter(Boolean).length >= 4;
}

function lineKind(line, liturgical) {
  if (!line.trim()) return "blank";
  const t = line.trim();
  if (liturgical) {
    if (/^Pe\s*:/i.test(t)) return "priest";
    if (/^T\s*:/i.test(t)) return "assembly";
  }
  if (isSectionMarkerLine(line)) return "marker";
  if (shouldJustify(line)) return "justify";
  return "left";
}

export default function LetraView({ text, className, liturgical = false }) {
  const lines = text.split("\n");

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const kind = lineKind(line, liturgical);
        if (kind === "blank") {
          return (
            <div
              key={i}
              className="present-letra-line present-letra-line--blank"
              aria-hidden="true"
            />
          );
        }

        return (
          <p key={i} className={`present-letra-line present-letra-line--${kind}`}>
            {line}
          </p>
        );
      })}
    </div>
  );
}
