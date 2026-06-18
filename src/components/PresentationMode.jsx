import { useEffect, useState } from "react";
import { C, FONT } from "../constants.js";
import { hasChords, parseKey, stripChordsFromLyrics } from "../lib/transpose.js";
import CifraView from "./CifraView.jsx";
import LetraView from "./LetraView.jsx";

const CC_ORANGE = "#FF7700";
const BG = "#0f1419";
const CC_KEYS = [
  { semi: 9, short: "A" },
  { semi: 10, short: "Bb" },
  { semi: 11, short: "B" },
  { semi: 0, short: "C" },
  { semi: 1, short: "Db" },
  { semi: 2, short: "D" },
  { semi: 3, short: "Eb" },
  { semi: 4, short: "E" },
  { semi: 5, short: "F" },
  { semi: 6, short: "F#" },
  { semi: 7, short: "G" },
  { semi: 8, short: "Ab" },
];

export default function PresentationMode({
  slides,
  onClose,
  onTranspose,
  onSetKey,
}) {
  const [idx, setIdx] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [showChords, setShowChords] = useState(true);
  const slide = slides[idx];
  const total = slides.length;
  const hasCifra = slide ? hasChords(slide.lyrics) : false;
  const showCifra = hasCifra && showChords;
  const currentSemi = slide?.key ? parseKey(slide.key) : null;

  const displayText =
    slide && hasCifra && !showChords
      ? stripChordsFromLyrics(slide.lyrics)
      : slide?.lyrics ?? "";

  useEffect(() => {
    setIdx((i) => Math.min(i, Math.max(0, total - 1)));
  }, [total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, total - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setFontScale((s) => Math.min(s + 0.1, 2));
      }
      if (e.key === "-") {
        e.preventDefault();
        setFontScale((s) => Math.max(s - 0.1, 0.6));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, total]);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  if (!slide) return null;

  return (
    <div
      className="present-shell"
      style={{ fontFamily: FONT, "--present-scale": fontScale }}
    >
      <header className="present-header">
        <div className="present-header__top">
        <div style={{ minWidth: 0, flex: 1 }}>
          {slide.songName && (
            <div className="present-title">{slide.songName}</div>
          )}
          <div className="present-meta">
            <span style={{ color: C.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {slide.label}
            </span>
            {slide.key ? (
              <span style={{ marginLeft: 8, color: showCifra ? CC_ORANGE : "#aaa", fontWeight: 600 }}>
                tom: {slide.key}
              </span>
            ) : null}
          </div>
        </div>
        <div className="present-tools">
          <ToolBtn label="A−" onClick={() => setFontScale((s) => Math.max(s - 0.1, 0.6))} title="Diminuir texto (−)" />
          <ToolBtn label="A+" onClick={() => setFontScale((s) => Math.min(s + 0.1, 2))} title="Aumentar texto (+)" />
          {hasCifra && (
            <ToolBtn
              label={showChords ? "♫ Cifra" : "♫ Só letra"}
              active={showChords}
              onClick={() => setShowChords((v) => !v)}
              title={showChords ? "Ocultar cifras" : "Mostrar cifras"}
            />
          )}
          <span style={{ fontSize: 12, color: "#888", marginLeft: 4 }}>
            {idx + 1} / {total}
          </span>
          <button type="button" className="btn btn-sm" onClick={onClose} style={exitBtn}>
            Sair
          </button>
        </div>
        </div>
      </header>

      {hasCifra && showChords && onTranspose && onSetKey && (
        <div className="present-keys">
          <div className="present-keys__row">
            <KeyBtn label="−½ tom" onClick={() => onTranspose(slide.id, -1)} title="Desce meio tom" />
            <KeyBtn label="+½ tom" onClick={() => onTranspose(slide.id, 1)} title="Sobe meio tom" />
            <span style={{ width: 1, background: "rgba(255,255,255,.15)", margin: "0 4px", alignSelf: "stretch" }} />
            {CC_KEYS.map((k) => (
              <KeyBtn
                key={k.short}
                label={k.short}
                active={currentSemi === k.semi}
                onClick={() => onSetKey(slide.id, k.semi)}
                title={`Tom ${k.short}`}
              />
            ))}
          </div>
        </div>
      )}

      <main className="present-main">
        <div className={`present-content ${showCifra ? "present-content--cifra" : "present-content--letra"}`}>
          {showCifra ? (
            <CifraView
              text={displayText}
              className={`present-text present-text--cifra`}
            />
          ) : (
            <LetraView text={displayText} className="present-text present-text--letra" />
          )}
        </div>
      </main>

      <footer className="present-footer">
        <button
          type="button"
          className="btn"
          disabled={idx === 0}
          onClick={() => setIdx((i) => i - 1)}
          style={{ ...navBtn, opacity: idx === 0 ? 0.35 : 1 }}
        >
          ← Anterior
        </button>
        <button
          type="button"
          className="btn"
          disabled={idx >= total - 1}
          onClick={() => setIdx((i) => i + 1)}
          style={{ ...navBtn, opacity: idx >= total - 1 ? 0.35 : 1 }}
        >
          Próximo →
        </button>
      </footer>
    </div>
  );
}

function ToolBtn({ label, onClick, title, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: "5px 8px",
        border: `1px solid ${active ? CC_ORANGE : "rgba(255,255,255,.2)"}`,
        borderRadius: 4,
        background: active ? "rgba(255,119,0,.25)" : "rgba(255,255,255,.08)",
        color: "#ddd",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: FONT,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function KeyBtn({ label, active, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: "8px 12px",
        minWidth: 40,
        minHeight: 40,
        border: `1px solid ${active ? CC_ORANGE : "rgba(255,255,255,.2)"}`,
        borderRadius: 4,
        background: active ? CC_ORANGE : "rgba(255,255,255,.08)",
        color: active ? "#fff" : "#ddd",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: FONT,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

const exitBtn = {
  background: "rgba(255,255,255,.1)",
  border: "none",
  color: "#fff",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  fontFamily: FONT,
};

const navBtn = {
  background: C.gold,
  color: C.nav,
  border: "none",
  borderRadius: 8,
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: FONT,
};
