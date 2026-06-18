import { useEffect, useRef, useState } from "react";
import { C, FONT, SECTIONS } from "../constants.js";
import { parsePdfFile, parsedToRepertoire, parseFilenameMeta } from "../lib/pdf-import.js";
import { hasChords } from "../lib/transpose.js";

export default function PdfImportModal({ open, onClose, onImport, defaultTitle, defaultDate }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const [missTitle, setMissTitle] = useState("");
  const [missDate, setMissDate] = useState("");
  const [sectionMap, setSectionMap] = useState({});

  useEffect(() => {
    if (open) {
      setMissTitle(defaultTitle || "");
      setMissDate(defaultDate || "");
    }
  }, [open, defaultTitle, defaultDate]);

  if (!open) return null;

  const reset = () => {
    setParsed(null);
    setError(null);
    setFileName("");
    setSectionMap({});
    setMissTitle(defaultTitle || "");
    setMissDate(defaultDate || "");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setFileName(file.name);
    const fromName = parseFilenameMeta(file.name);
    try {
      const result = await parsePdfFile(file);
      setParsed(result);
      setMissTitle(result.missTitle || fromName.missTitle || defaultTitle || file.name.replace(/\.pdf$/i, ""));
      setMissDate(result.missDate || fromName.missDate || defaultDate || "");
      setSectionMap({});
    } catch (err) {
      setError(err.message || "Não foi possível ler o PDF");
      setParsed(null);
    }
    setBusy(false);
  };

  const handleImport = () => {
    if (!parsed?.sections?.length) return;
    const repertoire = parsedToRepertoire(parsed, sectionMap);
    onImport({
      repertoire,
      missTitle: missTitle.trim(),
      missDate: missDate.trim(),
      fileName,
      sectionCount: parsed.sections.filter((s) => s.songs.length).length,
    });
    handleClose();
  };

  const totalSongs = parsed?.sections.reduce((n, s) => n + s.songs.length, 0) ?? 0;

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="pdf-import-title">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__head">
          <h2 id="pdf-import-title" style={{ margin: "0 0 4px", fontSize: 17, color: C.nav, fontFamily: FONT }}>Importar PDF de cifras</h2>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: C.textMuted, lineHeight: 1.45, fontFamily: FONT }}>
            O app detecta seções litúrgicas (Entrada, Glória, Comunhão…) e separa cada música conforme o PDF.
          </p>
        </div>

        <div className="modal-panel__body">
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={handleFile} />

          <button
            type="button"
            className="btn btn--block"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            style={{
              marginBottom: 12,
              background: C.gold,
              color: C.nav,
              opacity: busy ? 0.7 : 1,
              fontFamily: FONT,
            }}
          >
            {busy ? "Lendo PDF…" : fileName ? `Trocar arquivo (${fileName})` : "Escolher arquivo PDF"}
          </button>

          {error && (
            <p style={{ color: C.danger, fontSize: 13, margin: "0 0 12px", fontFamily: FONT }}>{error}</p>
          )}

          {(parsed || defaultTitle || defaultDate) && (
            <div className="form-row" style={{ marginBottom: 14 }}>
              <label style={lbl}>
                Missa / repertório
                <input className="inp" value={missTitle} onChange={(e) => setMissTitle(e.target.value)} placeholder="Ex: 12º Domingo do Tempo Comum" style={{ fontFamily: FONT }} />
              </label>
              <label style={lbl}>
                Data da missa
                <input className="inp" value={missDate} onChange={(e) => setMissDate(e.target.value)} placeholder="DD/MM/AAAA" style={{ fontFamily: FONT }} />
              </label>
            </div>
          )}

          {parsed && (
            <>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, fontFamily: FONT }}>
                {parsed.sections.length} seção(ões) · {totalSongs} música(s) detectada(s)
              </div>

              {parsed.sections.length === 0 ? (
                <p style={{ fontSize: 13, color: C.danger, fontFamily: FONT }}>
                  Nenhuma seção litúrgica encontrada. Verifique se o PDF usa títulos como Entrada, Glória, Comunhão…
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {parsed.sections.map((block) => (
                    <div
                      key={block.sectionId + block.sectionLabel}
                      className="card"
                      style={{ marginBottom: 0, padding: 0, overflow: "hidden" }}
                    >
                      <div style={{ background: C.searchBg, padding: "8px 10px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.search, flex: 1, minWidth: 100 }}>
                          PDF: {block.sectionLabel}
                        </span>
                        <span style={{ fontSize: 11, color: C.textMuted }}>→</span>
                        <select
                          className="inp"
                          value={sectionMap[block.sectionId] ?? block.sectionId}
                          onChange={(e) => setSectionMap({ ...sectionMap, [block.sectionId]: e.target.value })}
                          style={{ width: "auto", minWidth: 140, padding: "6px 8px", fontSize: 11, fontFamily: FONT, minHeight: 36 }}
                        >
                          {SECTIONS.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ padding: "8px 10px" }}>
                        {block.songs.map((song, idx) => (
                          <div key={idx} style={{ marginBottom: idx < block.songs.length - 1 ? 10 : 0, paddingBottom: idx < block.songs.length - 1 ? 10 : 0, borderBottom: idx < block.songs.length - 1 ? `1px dashed ${C.border}` : "none" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2, fontFamily: FONT }}>{song.title}</div>
                            {song.key && <div style={{ fontSize: 11, color: C.search, marginBottom: 4, fontFamily: FONT }}>Tom: {song.key}</div>}
                            <pre
                              style={{
                                margin: 0,
                                fontSize: 10,
                                lineHeight: 1.4,
                                maxHeight: 72,
                                overflow: "hidden",
                                color: C.textMuted,
                                fontFamily: hasChords(song.lyrics) ? '"Roboto Mono", Consolas, monospace' : FONT,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {song.lyrics.slice(0, 280)}{song.lyrics.length > 280 ? "…" : ""}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-panel__foot">
          <button type="button" className="btn btn--ghost" onClick={handleClose}>Cancelar</button>
          <button
            type="button"
            className="btn"
            disabled={!parsed?.sections?.length || busy}
            onClick={handleImport}
            style={{ background: C.gold, color: C.nav, fontFamily: FONT, opacity: parsed?.sections?.length ? 1 : 0.4 }}
          >
            Importar para Montar
          </button>
        </div>
      </div>
    </div>
  );
}

const lbl = { fontSize: 11, fontWeight: 600, color: C.textMuted, display: "block", fontFamily: FONT };
