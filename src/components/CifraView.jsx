import {
  isChordOnlyLine,
  isSectionMarkerLine,
  splitLineByChords,
} from "../lib/transpose.js";

function lineKind(line) {
  if (!line.trim()) return "blank";
  if (isSectionMarkerLine(line)) return "marker";
  if (isChordOnlyLine(line)) return "chords";
  return "lyrics";
}

export default function CifraView({ text, className }) {
  const lines = text.split("\n");

  return (
    <pre className={className}>
      {lines.map((line, i) => {
        const kind = lineKind(line);
        const lineClass =
          kind === "blank" ? "cifra-line" : `cifra-line cifra-line--${kind}`;

        return (
          <span key={i} className={lineClass}>
            {kind === "marker" ? (
              line
            ) : (
              splitLineByChords(line).map((part, j) =>
                part.type === "chord" ? (
                  <span key={j} className="cifra-chord">
                    {part.value}
                  </span>
                ) : (
                  <span key={j}>{part.value}</span>
                )
              )
            )}
            {i < lines.length - 1 ? "\n" : null}
          </span>
        );
      })}
    </pre>
  );
}
