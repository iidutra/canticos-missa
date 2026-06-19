import { useEffect, useRef, useState } from "react";
import { C, FONT } from "../constants.js";
import { hasChords, parseKey, stripChordsFromLyrics } from "../lib/transpose.js";
import {
  loadPresentationContext,
  loadGlobalPresentationPrefs,
  savePresentationContext,
} from "../lib/presentation-store.js";
import CifraView from "./CifraView.jsx";
import LetraView from "./LetraView.jsx";
import TabView from "./TabView.jsx";
import TabDrawCanvas from "./TabDrawCanvas.jsx";

const CC_ORANGE = "#FF7700";
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
  contextKey,
  onClose,
  onTranspose,
  onSetKey,
  onTabChange,
  onTabDrawChange,
  onRestoreKeys,
}) {
  const [idx, setIdx] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [showChords, setShowChords] = useState(true);
  const [showTabPanel, setShowTabPanel] = useState(false);
  const [tabEditMode, setTabEditMode] = useState("text");
  const [tabs, setTabs] = useState({});
  const [tabDraws, setTabDraws] = useState({});
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);
  const keysSaved = useRef("");

  const slide = slides[idx];
  const total = slides.length;
  const hasCifra = slide ? hasChords(slide.lyrics) : false;
  const showCifra = hasCifra && showChords;
  const currentSemi = slide?.key ? parseKey(slide.key) : null;
  const tabText = slide ? tabs[slide.id] ?? slide.percTab ?? "" : "";
  const tabDraw = slide ? tabDraws[slide.id] ?? slide.percTabDraw ?? "" : "";

  const displayText =
    slide && hasCifra && !showChords
      ? stripChordsFromLyrics(slide.lyrics)
      : slide?.lyrics ?? "";

  const isLiturgicalSlide =
    slide &&
    (/^(oe[1-5]|oracao_)/.test(slide.id) || /^Pe\s*:/im.test(displayText));

  useEffect(() => {
    setIdx((i) => Math.min(i, Math.max(0, total - 1)));
  }, [total]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ctx, globalPrefs] = await Promise.all([
        contextKey ? loadPresentationContext(contextKey) : null,
        loadGlobalPresentationPrefs(),
      ]);
      if (cancelled) return;

      const initial = {};
      const initialDraws = {};
      slides.forEach((s) => {
        initial[s.id] = ctx?.tabs?.[s.id] ?? s.percTab ?? "";
        initialDraws[s.id] = ctx?.tabDraws?.[s.id] ?? s.percTabDraw ?? "";
      });
      setTabs(initial);
      setTabDraws(initialDraws);

      const prefView = ctx?.prefs?.viewMode ?? globalPrefs.viewMode;
      if (prefView === "tab") {
        setShowTabPanel(true);
        setShowChords(true);
      } else if (prefView === "letra") {
        setShowChords(false);
      } else if (prefView === "cifra") {
        setShowChords(true);
      }

      const prefTab =
        ctx?.prefs?.showTabPanel ?? globalPrefs.showTabPanel;
      if (typeof prefTab === "boolean") {
        setShowTabPanel(prefTab);
      } else if (prefView === "tab") {
        setShowTabPanel(true);
      }

      const prefTabMode = ctx?.prefs?.tabEditMode ?? globalPrefs.tabEditMode;
      if (prefTabMode === "text" || prefTabMode === "draw") {
        setTabEditMode(prefTabMode);
      }

      const prefScale = ctx?.prefs?.fontScale ?? globalPrefs.fontScale;
      if (typeof prefScale === "number" && prefScale >= 0.6 && prefScale <= 2) {
        setFontScale(prefScale);
      }

      if (ctx?.keys && onRestoreKeys) {
        onRestoreKeys(ctx.keys);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [contextKey]);

  useEffect(() => {
    if (!loaded || !contextKey) return;
    const keys = {};
    slides.forEach((s) => {
      if (s.key) keys[s.id] = s.key;
    });
    const serialized = JSON.stringify(keys);
    if (serialized === keysSaved.current) return;
    keysSaved.current = serialized;
    savePresentationContext(contextKey, { keys });
  }, [slides, loaded, contextKey]);

  const scheduleSave = (partial) => {
    if (!contextKey) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePresentationContext(contextKey, partial);
    }, 400);
  };

  useEffect(() => {
    if (!loaded || !contextKey) return;
    const viewMode = showChords ? "cifra" : "letra";
    scheduleSave({
      prefs: { viewMode, showTabPanel, tabEditMode, fontScale },
      prefsGlobal: { viewMode, showTabPanel, tabEditMode, fontScale },
    });
    return () => clearTimeout(saveTimer.current);
  }, [showChords, showTabPanel, tabEditMode, fontScale, loaded, contextKey]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "CANVAS") return;
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

  const handleTabEdit = (value) => {
    if (!slide) return;
    setTabs((prev) => ({ ...prev, [slide.id]: value }));
    onTabChange?.(slide.id, value);
    scheduleSave({ tabs: { [slide.id]: value } });
  };

  const handleTabDrawEdit = (value) => {
    if (!slide) return;
    setTabDraws((prev) => ({ ...prev, [slide.id]: value }));
    onTabDrawChange?.(slide.id, value);
    scheduleSave({ tabDraws: { [slide.id]: value } });
  };

  if (!slide) return null;

  return (
    <div
      className="present-shell"
      style={{ fontFamily: FONT, "--present-scale": fontScale }}
    >
      <header className="present-header">
        <div className="present-header__top">
          <div className="present-header__info">
            {slide.songName && (
              <div className="present-title">{slide.songName}</div>
            )}
            <div className="present-meta">
              <span
                style={{
                  color: C.gold,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {slide.label}
              </span>
              {slide.key ? (
                <span
                  style={{
                    color: showCifra ? CC_ORANGE : "#aaa",
                    fontWeight: 600,
                  }}
                >
                  tom: {slide.key}
                </span>
              ) : null}
            </div>
          </div>
          <div className="present-tools">
            <ToolBtn
              label="A−"
              onClick={() => setFontScale((s) => Math.max(s - 0.1, 0.6))}
              title="Diminuir texto (−)"
            />
            <ToolBtn
              label="A+"
              onClick={() => setFontScale((s) => Math.min(s + 0.1, 2))}
              title="Aumentar texto (+)"
            />
            {hasCifra && (
              <>
                <ToolBtn
                  label="♫ Cifra"
                  active={showChords}
                  onClick={() => setShowChords(true)}
                  title="Mostrar cifra"
                />
                <ToolBtn
                  label="Só letra"
                  active={!showChords}
                  onClick={() => setShowChords(false)}
                  title="Ocultar cifras"
                />
              </>
            )}
            <ToolBtn
              label="🥁 Tab"
              active={showTabPanel}
              onClick={() => setShowTabPanel((v) => !v)}
              title={
                showTabPanel
                  ? "Ocultar painel de percussão"
                  : "Mostrar tab ao lado da música"
              }
            />
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
            <span
              style={{
                width: 1,
                background: "rgba(255,255,255,.15)",
                margin: "0 4px",
                alignSelf: "stretch",
              }}
            />
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

      <main className={`present-main${showTabPanel ? " present-main--split" : ""}`}>
        <div className="present-split">
          <div
            className={`present-content present-content--music ${
              showCifra ? "present-content--cifra" : "present-content--letra"
            }`}
          >
            {showCifra ? (
              <CifraView text={displayText} className="present-text present-text--cifra" />
            ) : (
              <LetraView
                text={displayText}
                className="present-text present-text--letra"
                liturgical={isLiturgicalSlide}
              />
            )}
          </div>

          {showTabPanel && (
            <aside className="present-tab-panel" aria-label="Tab de percussão">
              <div className="present-tab-panel__head">
                <span className="present-tab-panel__title">Tab — percussão</span>
                <div className="present-tab-panel__modes">
                  <TabModeBtn
                    label="Texto"
                    active={tabEditMode === "text"}
                    onClick={() => setTabEditMode("text")}
                  />
                  <TabModeBtn
                    label="Desenho"
                    active={tabEditMode === "draw"}
                    onClick={() => setTabEditMode("draw")}
                  />
                </div>
              </div>
              {tabEditMode === "text" ? (
                <TabView
                  value={tabText}
                  onChange={handleTabEdit}
                  className="present-text present-text--tab"
                  fontScale={fontScale}
                />
              ) : (
                <TabDrawCanvas
                  key={slide.id}
                  value={tabDraw}
                  onChange={handleTabDrawEdit}
                  className="present-tab-panel__draw"
                />
              )}
            </aside>
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

function TabModeBtn({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 10px",
        border: `1px solid ${active ? CC_ORANGE : "rgba(255,255,255,.2)"}`,
        borderRadius: 4,
        background: active ? "rgba(255,119,0,.25)" : "rgba(255,255,255,.08)",
        color: "#ddd",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        cursor: "pointer",
        fontFamily: FONT,
      }}
    >
      {label}
    </button>
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
