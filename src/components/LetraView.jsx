import { isSectionMarkerLine } from "../lib/transpose.js";

function shouldJustify(line) {
  const t = line.trim();
  if (!t || isSectionMarkerLine(line)) return false;
  return t.length >= 28 || t.split(/\s+/).filter(Boolean).length >= 4;
}

export default function LetraView({ text, className }) {
  const lines = text.split("\n");

  return (
    <div className={className}>
      {lines.map((line, i) => {
        if (!line.trim()) {
          return (
            <div
              key={i}
              className="present-letra-line present-letra-line--blank"
              aria-hidden="true"
            />
          );
        }

        const marker = isSectionMarkerLine(line);
        const kind = marker ? "marker" : shouldJustify(line) ? "justify" : "left";

        return (
          <p key={i} className={`present-letra-line present-letra-line--${kind}`}>
            {line}
          </p>
        );
      })}
    </div>
  );
}
