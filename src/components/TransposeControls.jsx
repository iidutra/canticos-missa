import { C, FONT } from "../constants.js";
import {
  KEY_OPTIONS,
  getHarmonicField,
  parseKey,
} from "../lib/transpose.js";

export default function TransposeControls({
  keyLabel,
  semitones,
  hasContent,
  onDownHalf,
  onUpHalf,
  onDownWhole,
  onUpWhole,
  onSelectKey,
  onReset,
  compact,
}) {
  if (!hasContent) return null;

  const field = keyLabel ? getHarmonicField(keyLabel) : [];
  const sm = {
    padding: compact ? "4px 8px" : "5px 10px",
    border: "none",
    borderRadius: 4,
    fontSize: compact ? 10 : 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT,
  };

  return (
    <div
      style={{
        background: C.goldLight,
        borderRadius: 6,
        padding: compact ? 8 : 10,
        marginBottom: 10,
        border: `1px solid ${C.gold}55`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: field.length ? 8 : 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: C.nav }}>
          ♯ Tom / transposição
          {keyLabel && (
            <span style={{ fontWeight: 600, color: C.search, marginLeft: 6 }}>
              {keyLabel}
            </span>
          )}
          {semitones !== 0 && (
            <span style={{ fontWeight: 500, color: C.textMuted, marginLeft: 4 }}>
              ({semitones > 0 ? "+" : ""}
              {semitones} semitom{Math.abs(semitones) !== 1 ? "s" : ""})
            </span>
          )}
        </span>
        {semitones !== 0 && (
          <button
            type="button"
            onClick={onReset}
            style={{ ...sm, background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` }}
          >
            Tom original
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" onClick={onDownHalf} title="Desce meio tom (−1 semitom)" style={{ ...sm, background: C.nav, color: C.navText }}>
          −½ tom
        </button>
        <button type="button" onClick={onUpHalf} title="Sobe meio tom (+1 semitom)" style={{ ...sm, background: C.nav, color: C.navText }}>
          +½ tom
        </button>
        <button type="button" onClick={onDownWhole} title="Desce um tom (−2 semitons)" style={{ ...sm, background: C.search, color: "#fff" }}>
          −1 tom
        </button>
        <button type="button" onClick={onUpWhole} title="Sobe um tom (+2 semitons)" style={{ ...sm, background: C.search, color: "#fff" }}>
          +1 tom
        </button>
        <select
          value={parseKey(keyLabel) ?? ""}
          onChange={(e) => onSelectKey(Number(e.target.value))}
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            border: `1px solid ${C.border}`,
            fontSize: 11,
            fontFamily: FONT,
            background: "#fff",
            minWidth: 110,
          }}
        >
          <option value="">Ir para tom…</option>
          {KEY_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      {field.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>
            Campo harmônico maior
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {field.map((f) => (
              <span
                key={f.degree}
                style={{
                  fontSize: 10,
                  background: "#fff",
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  color: C.text,
                }}
              >
                <strong style={{ color: C.nav }}>{f.degree}</strong> {f.chord}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
