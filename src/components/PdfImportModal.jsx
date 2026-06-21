import { useEffect, useRef, useState } from "react";
import { SECTIONS } from "../constants.js";
import { parseDocumentFile, parsedToRepertoire, parsedToLibraryEntries, parseFilenameMeta, ACCEPT_DOCUMENTS, documentKind } from "../lib/pdf-import.js";
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
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [importToMontar, setImportToMontar] = useState(true);

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
    setSaveToLibrary(true);
    setImportToMontar(true);
    setMissTitle(defaultTitle || "");
    setMissDate(defaultDate || "");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickFile = () => {
    if (!busy) fileRef.current?.click();
  };

  const processFile = async (file) => {
    if (!file) return;
    const kind = documentKind(file.name, file.type);
    if (!kind) {
      setError("Formato não reconhecido. Use PDF, DOC ou DOCX.");
      return;
    }
    setBusy(true);
    setError(null);
    setFileName(file.name);
    setParsed(null);
    const fromName = parseFilenameMeta(file.name);
    try {
      const result = await parseDocumentFile(file);
      setParsed(result);
      setMissTitle(result.missTitle || fromName.missTitle || defaultTitle || file.name.replace(/\.(pdf|docx?)$/i, ""));
      setMissDate(result.missDate || fromName.missDate || defaultDate || "");
      setSectionMap({});
    } catch (err) {
      setError(err.message || "Não foi possível ler o documento");
      setParsed(null);
    }
    setBusy(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    await processFile(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    await processFile(file);
  };

  const handleImport = () => {
    if (!parsed?.sections?.length) return;
    if (!importToMontar && !saveToLibrary) return;

    const repertoire = importToMontar ? parsedToRepertoire(parsed, sectionMap) : null;
    const libraryEntries = saveToLibrary ? parsedToLibraryEntries(parsed, sectionMap) : [];

    onImport({
      repertoire,
      libraryEntries,
      missTitle: missTitle.trim(),
      missDate: missDate.trim(),
      fileName,
      sectionCount: parsed.sections.filter((s) => s.songs.length).length,
      songCount: libraryEntries.length,
      importToMontar,
      saveToLibrary,
    });
    handleClose();
  };

  const sectionLabel = (id) => SECTIONS.find((s) => s.id === id)?.label ?? id;
  const libraryPreviewCount = parsed ? parsedToLibraryEntries(parsed, sectionMap).length : 0;
  const totalSongs = parsed?.sections.reduce((n, s) => n + s.songs.length, 0) ?? 0;
  const step = !fileName ? 1 : parsed ? 3 : busy ? 2 : 2;
  const isPdfError = error && /\.pdf$/i.test(fileName);

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="pdf-import-title">
      <div className="modal-panel modal-panel--import" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__head">
          <h2 id="pdf-import-title" className="modal-panel__title">Importar documento de cifras</h2>
          <p className="modal-panel__desc">
            PDF, DOC ou DOCX — detecta seções litúrgicas e pode salvar cada música na biblioteca e/ou montar o repertório da missa.
          </p>
        </div>

        <div className="modal-panel__body">
          <div className="import-steps" aria-hidden>
            <span className={`import-step${step === 1 ? " import-step--active" : step > 1 ? " import-step--done" : ""}`}>1. Arquivo</span>
            <span className={`import-step${step === 2 ? " import-step--active" : step > 2 ? " import-step--done" : ""}`}>2. Revisar</span>
            <span className={`import-step${step === 3 ? " import-step--active" : ""}`}>3. Importar</span>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_DOCUMENTS}
            hidden
            onChange={handleFile}
          />

          <div
            className={`import-file-zone${busy ? " import-file-zone--busy" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <span className="import-file-zone__icon" aria-hidden>📄</span>
            {fileName ? (
              <p className="import-file-name u-truncate" title={fileName}>{fileName}</p>
            ) : (
              <p className="import-file-zone__hint">Toque para escolher ou arraste o arquivo aqui</p>
            )}
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={pickFile}
              style={{ background: "var(--c-gold)", color: "var(--c-nav)" }}
            >
              {busy ? "Lendo documento…" : fileName ? "Trocar arquivo" : "Escolher PDF, DOC ou DOCX"}
            </button>
            <p className="import-file-zone__hint">Formatos: .pdf, .doc, .docx</p>
          </div>

          {error && (
            <div className="import-error" role="alert">
              {error}
              {isPdfError && (
                <p className="import-error__tip">
                  Dicas: use um PDF com texto selecionável (não escaneado); no celular, tente enviar o arquivo pelo gerenciador de arquivos em vez de abrir direto do WhatsApp; se for Word antigo (.doc), prefira salvar como .docx.
                </p>
              )}
            </div>
          )}

          {(parsed || defaultTitle || defaultDate || fileName) && (
            <div className="form-row form-row--2" style={{ marginBottom: 14 }}>
              <label className="label-sm">
                Missa / repertório
                <input className="inp" value={missTitle} onChange={(e) => setMissTitle(e.target.value)} placeholder="Ex: 12º Domingo do Tempo Comum" />
              </label>
              <label className="label-sm">
                Data da missa
                <input className="inp" value={missDate} onChange={(e) => setMissDate(e.target.value)} placeholder="DD/MM/AAAA" />
              </label>
            </div>
          )}

          {parsed && (
            <>
              <p className="import-meta">
                {parsed.sections.length} seção(ões) · {totalSongs} música(s) detectada(s)
              </p>

              {parsed.sections.length === 0 ? (
                <p className="import-error">
                  Nenhuma seção litúrgica encontrada. Verifique se o documento usa títulos como Entrada, Glória, Comunhão…
                </p>
              ) : (
                <div className="import-sections">
                  {parsed.sections.map((block) => (
                    <div key={block.sectionId + block.sectionLabel} className="card import-section-card">
                      <div className="import-section-card__head">
                        <div className="import-section-card__row">
                          <span className="import-section-card__label">{block.sectionLabel}</span>
                        </div>
                        <select
                          className="inp import-section-card__map"
                          value={sectionMap[block.sectionId] ?? block.sectionId}
                          onChange={(e) => setSectionMap({ ...sectionMap, [block.sectionId]: e.target.value })}
                          aria-label={`Destino da seção ${block.sectionLabel}`}
                        >
                          {SECTIONS.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                        {saveToLibrary && (
                          <span className="import-section-card__hint">
                            Biblioteca: {sectionLabel(sectionMap[block.sectionId] ?? block.sectionId)}
                          </span>
                        )}
                      </div>
                      {block.songs.map((song, idx) => (
                        <div key={idx} className="import-song">
                          <p className="import-song__title">{song.title}</p>
                          {song.key && <p className="import-song__key">Tom: {song.key}</p>}
                          <pre className={`cifra-preview${hasChords(song.lyrics) ? "" : " cifra-preview--lyrics"}`}>
                            {song.lyrics.slice(0, 320)}{song.lyrics.length > 320 ? "…" : ""}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="import-options">
                <label className="import-option">
                  <input type="checkbox" checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)} />
                  <span>Salvar cada música na biblioteca (Entrada, Ato, Glória…)</span>
                </label>
                <label className="import-option">
                  <input type="checkbox" checked={importToMontar} onChange={(e) => setImportToMontar(e.target.checked)} />
                  <span>Montar repertório desta missa (aba Montar)</span>
                </label>
                {saveToLibrary && libraryPreviewCount > 0 && (
                  <p className="import-meta" style={{ marginBottom: 0 }}>
                    {libraryPreviewCount} música(s) serão adicionadas à biblioteca, separadas por seção.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-panel__foot">
          <button type="button" className="btn btn--ghost" onClick={handleClose}>Cancelar</button>
          <button
            type="button"
            className="btn"
            disabled={!parsed?.sections?.length || busy || (!importToMontar && !saveToLibrary)}
            onClick={handleImport}
            style={{ background: "var(--c-gold)", color: "var(--c-nav)" }}
          >
            {saveToLibrary && !importToMontar
              ? "Salvar na biblioteca"
              : saveToLibrary && importToMontar
                ? "Importar (Montar + Biblioteca)"
                : "Importar para Montar"}
          </button>
        </div>
      </div>
    </div>
  );
}
