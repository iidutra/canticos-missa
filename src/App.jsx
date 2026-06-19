import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SECTIONS, C, FONT, emptyRepertoire, mergeRepertoire, filledSections } from "./constants.js";
import { fetchLyrics, buildCifraClubSearchUrl } from "./lib/lyrics.js";
import { downloadDoc, downloadDocx, downloadJson } from "./lib/doc.js";
import PresentationMode from "./components/PresentationMode.jsx";
import TransposeControls from "./components/TransposeControls.jsx";
import LiturgyDashboard from "./components/LiturgyDashboard.jsx";
import PdfImportModal from "./components/PdfImportModal.jsx";
import AppNav from "./components/AppNav.jsx";
import { cleanSongName, parseBrDate } from "./lib/liturgia.js";
import {
  initBlockWithContent,
  transposeBlock,
  resetTranspose,
  setBlockToKey,
  syncManualEdit,
  hasChords,
  parseKey,
} from "./lib/transpose.js";
import { buildPresentationContextKey } from "./lib/presentation-store.js";
import {
  ORACOES_PROPRIAS,
  getOracaoEucaristica,
  isLiturgicalSection,
  sectionPlaceholder,
} from "./lib/oracoes-liturgicas.js";

const CIFRA_PLACEHOLDER = ` D             G
Senhor, se Tu me chamas
 A7        D
Eu quero te ouvir
(cole no formato cifra acima da letra, com espaços alinhados)`;

const cifraStyle = (text) =>
  hasChords(text)
    ? { fontFamily: '"Roboto Mono", Consolas, "Courier New", monospace', fontSize: 12, lineHeight: 1.5, whiteSpace: "pre" }
    : { lineHeight: 1.6 };

export default function App() {
  const [tab, setTab] = useState("home");
  const [sections, setSections] = useState(emptyRepertoire());
  const [library, setLibrary] = useState([]);
  const [savedReps, setSavedReps] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [repMissDate, setRepMissDate] = useState("");
  const [repMissTitle, setRepMissTitle] = useState("");
  const [repMpmSlug, setRepMpmSlug] = useState("");
  const [savedFilterMonth, setSavedFilterMonth] = useState("");
  const [sName, setSName] = useState("");
  const [sArtist, setSArtist] = useState("");
  const [sKey, setSKey] = useState("");
  const [sBaseLyrics, setSBaseLyrics] = useState("");
  const [sBaseKey, setSBaseKey] = useState("");
  const [sSemitones, setSSemitones] = useState(0);
  const [sCat, setSCat] = useState("entrada");
  const [sLyrics, setSLyrics] = useState("");
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [deletingLib, setDeletingLib] = useState(null);
  const [deletingRep, setDeletingRep] = useState(null);
  const [busy, setBusy] = useState(false);
  const [docBusy, setDocBusy] = useState(false);
  const [secBusy, setSecBusy] = useState(null);
  const [secQ, setSecQ] = useState({});
  const [secA, setSecA] = useState({});
  const [fallbackUrl, setFallbackUrl] = useState(null);
  const [secFallback, setSecFallback] = useState({});
  const [presentOpen, setPresentOpen] = useState(false);
  const [presentSource, setPresentSource] = useState(null);
  const [presentRepId, setPresentRepId] = useState(null);
  const [presentMeta, setPresentMeta] = useState(null);
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [pdfDefaults, setPdfDefaults] = useState({ title: "", date: "" });
  const importLibRef = useRef(null);
  const importRepRef = useRef(null);
  const sectionsRef = useRef(sections);
  const presentSourceRef = useRef(presentSource);
  sectionsRef.current = sections;
  presentSourceRef.current = presentSource;

  const flash = useCallback((msg, err) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("lib");
        if (r) setLibrary(JSON.parse(r.value));
      } catch {}
      try {
        const r = await window.storage.get("reps");
        if (r) setSavedReps(JSON.parse(r.value));
      } catch {}
      try {
        const r = await window.storage.get("cur");
        if (r) setSections(mergeRepertoire(JSON.parse(r.value)));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const persist = async (k, v, setter) => {
    setter(v);
    try {
      await window.storage.set(k, JSON.stringify(v));
    } catch {}
  };
  const setLib = (v) => persist("lib", v, setLibrary);
  const setCur = (v) => persist("cur", v, setSections);
  const setReps = (v) => persist("reps", v, setSavedReps);

  const switchTab = (k) => {
    setDeletingLib(null);
    setDeletingRep(null);
    setTab(k);
  };

  const upd = (id, fields) => {
    const next = syncManualEdit(sections[id], fields);
    setCur({ ...sections, [id]: next });
  };

  const updateSectionBlock = useCallback((secId, updater) => {
    if (presentSourceRef.current) {
      setPresentSource((prev) => ({ ...prev, [secId]: updater(prev[secId]) }));
    } else {
      const next = {
        ...sectionsRef.current,
        [secId]: updater(sectionsRef.current[secId]),
      };
      setCur(next);
    }
  }, []);

  const transposeSection = (secId, delta) => {
    updateSectionBlock(secId, (block) => transposeBlock(block, delta));
  };

  const resetSectionTranspose = (secId) => {
    updateSectionBlock(secId, (block) => resetTranspose(block));
  };

  const setSectionToKey = (secId, targetSemi) => {
    if (targetSemi === "" || Number.isNaN(targetSemi)) return;
    updateSectionBlock(secId, (block) => setBlockToKey(block, targetSemi));
  };

  const updatePercTab = (secId, percTab) => {
    updateSectionBlock(secId, (block) => ({ ...block, percTab }));
  };

  const updatePercTabDraw = (secId, percTabDraw) => {
    updateSectionBlock(secId, (block) => ({ ...block, percTabDraw }));
  };

  const restorePresentationKeys = useCallback(
    (keysMap) => {
      if (!keysMap) return;
      for (const [secId, keyStr] of Object.entries(keysMap)) {
        const semi = parseKey(keyStr);
        if (semi === null || semi === undefined) continue;
        updateSectionBlock(secId, (block) => setBlockToKey(block, semi));
      }
    },
    [updateSectionBlock]
  );

  const libTranspose = (delta) => {
    const block = {
      lyrics: sLyrics,
      key: sKey,
      baseLyrics: sBaseLyrics || sLyrics,
      baseKey: sBaseKey || sKey,
      semitones: sSemitones,
    };
    const next = transposeBlock(block, delta);
    setSBaseLyrics(next.baseLyrics);
    setSBaseKey(next.baseKey);
    setSSemitones(next.semitones);
    setSLyrics(next.lyrics);
    setSKey(next.key);
  };

  const libSetToKey = (targetSemi) => {
    if (targetSemi === "" || Number.isNaN(targetSemi)) return;
    const block = {
      lyrics: sLyrics,
      key: sKey,
      baseLyrics: sBaseLyrics || sLyrics,
      baseKey: sBaseKey || sKey,
      semitones: sSemitones,
    };
    const next = setBlockToKey(block, targetSemi);
    setSBaseLyrics(next.baseLyrics);
    setSBaseKey(next.baseKey);
    setSSemitones(next.semitones);
    setSLyrics(next.lyrics);
    setSKey(next.key);
  };

  const libResetTranspose = () => {
    setSLyrics(sBaseLyrics || sLyrics);
    setSKey(sBaseKey || sKey);
    setSSemitones(0);
  };

  const syncLibLyrics = (lyrics) => {
    setSLyrics(lyrics);
    if (sSemitones === 0) {
      setSBaseLyrics(lyrics);
    }
  };

  const syncLibKey = (key) => {
    setSKey(key);
    if (sSemitones === 0) {
      setSBaseKey(key);
    }
  };

  const doSearch = async (secId) => {
    const nm = secQ[secId]?.trim();
    const ar = secA[secId]?.trim();
    if (!nm) {
      flash("Digite o nome da música", true);
      return;
    }
    setSecBusy(secId);
    setSecFallback((prev) => ({ ...prev, [secId]: null }));
    try {
      const { lyrics, key, songName } = await fetchLyrics(nm, ar);
      if (lyrics) {
        setCur({
          ...sections,
          [secId]: initBlockWithContent({
            included: true,
            lyrics,
            songName: songName || nm,
            key: key || "",
          }),
        });
        flash(`Cifra de "${songName || nm}" importada do Cifra Club!`);
      } else {
        setSecFallback((prev) => ({
          ...prev,
          [secId]: buildCifraClubSearchUrl(nm, ar),
        }));
        flash("Não encontrada no Cifra Club. Use o link abaixo.", true);
      }
    } catch {
      flash("Erro na busca.", true);
    }
    setSecBusy(null);
  };

  const doLibSearch = async () => {
    if (!sName.trim()) {
      flash("Digite o nome", true);
      return;
    }
    setBusy(true);
    setFallbackUrl(null);
    try {
      const { lyrics, key, songName } = await fetchLyrics(sName, sArtist);
      if (lyrics) {
        setSLyrics(lyrics);
        if (key) {
          setSKey(key);
          setSBaseKey(key);
        }
        if (songName && !sName.trim()) setSName(songName);
        setSBaseLyrics(lyrics);
        setSSemitones(0);
        flash("Cifra importada do Cifra Club! Revise e salve.");
      } else {
        setFallbackUrl(buildCifraClubSearchUrl(sName, sArtist));
        flash("Não encontrada no Cifra Club. Use o link abaixo.", true);
      }
    } catch {
      flash("Erro na busca.", true);
    }
    setBusy(false);
  };

  const resetLibForm = () => {
    setSName("");
    setSArtist("");
    setSKey("");
    setSBaseLyrics("");
    setSBaseKey("");
    setSSemitones(0);
    setSLyrics("");
    setSCat("entrada");
    setFallbackUrl(null);
    setEditing(null);
  };

  const addToLib = (override) => {
    const name = (override?.name ?? sName).trim();
    const artist = (override?.artist ?? sArtist).trim();
    const key = (override?.key ?? sKey).trim();
    const category = override?.category ?? sCat;
    const lyrics = (override?.lyrics ?? sLyrics).trim();
    if (!name || !lyrics) {
      flash("Preencha nome e letra", true);
      return;
    }
    const baseLyrics = override?.baseLyrics ?? (sSemitones === 0 ? lyrics : (sBaseLyrics || lyrics));
    const baseKey = override?.baseKey ?? (sSemitones === 0 ? key : (sBaseKey || key));
    const entry = {
      id: editing ? editing.id : Date.now().toString(),
      name,
      artist,
      key,
      category,
      lyrics,
      baseLyrics,
      baseKey,
      semitones: 0,
    };
    if (editing) {
      setLib(library.map((s) => (s.id === editing.id ? entry : s)));
      flash("Atualizada!");
    } else {
      setLib([...library, entry]);
      flash("Salva na biblioteca!");
    }
    resetLibForm();
  };

  const saveSectionToLib = (secId) => {
    const d = sections[secId];
    const name = d.songName?.trim() || secQ[secId]?.trim();
    if (!name || !d.lyrics?.trim()) {
      flash("Preencha nome e letra", true);
      return;
    }
    addToLib({
      name,
      artist: secA[secId]?.trim() || "",
      key: d.key || "",
      category: secId,
      lyrics: d.lyrics,
      baseLyrics: d.baseLyrics ?? d.lyrics,
      baseKey: d.baseKey ?? d.key ?? "",
    });
  };

  const useInSection = (song) => {
    const lyrics = song.lyrics ?? "";
    const key = song.key ?? "";
    setCur({
      ...sections,
      [song.category]: {
        included: true,
        songName: song.name,
        lyrics,
        key,
        baseLyrics: song.baseLyrics ?? lyrics,
        baseKey: song.baseKey ?? key,
        semitones: song.semitones ?? 0,
      },
    });
    switchTab("build");
    flash(`"${song.name}" inserida!`);
  };

  const openPdfImport = (defaults = {}) => {
    setPdfDefaults({
      title: defaults.title || "",
      date: defaults.date || "",
    });
    setPdfImportOpen(true);
  };

  const mergeLibraryImport = (existing, incoming) => {
    const byKey = new Map(
      existing.map((s) => [`${s.category}:${s.name.trim().toLowerCase()}`, s])
    );
    const out = [...existing];
    for (const entry of incoming) {
      const key = `${entry.category}:${entry.name.trim().toLowerCase()}`;
      const prev = byKey.get(key);
      if (prev) {
        const idx = out.findIndex((s) => s.id === prev.id);
        if (idx >= 0) {
          out[idx] = { ...entry, id: prev.id };
        }
      } else {
        out.push(entry);
        byKey.set(key, entry);
      }
    }
    return out;
  };

  const handlePdfImport = ({
    repertoire,
    libraryEntries = [],
    missTitle,
    missDate,
    sectionCount,
    songCount = 0,
    importToMontar = true,
    saveToLibrary = false,
  }) => {
    if (importToMontar && repertoire) {
      setCur(mergeRepertoire(repertoire));
      if (missTitle || missDate) {
        setSaveName(missDate ? `${missTitle || "Missa"} — ${missDate}` : missTitle);
        if (missDate) setRepMissDate(missDate);
        if (missTitle) setRepMissTitle(missTitle);
      }
    }

    if (saveToLibrary && libraryEntries.length) {
      const merged = mergeLibraryImport(library, libraryEntries);
      setLib(merged);
    }

    const parts = [];
    if (importToMontar) parts.push(`${sectionCount} seção(ões) na Montagem`);
    if (saveToLibrary && songCount) parts.push(`${songCount} música(s) na biblioteca`);

    if (importToMontar) switchTab("build");
    else if (saveToLibrary) switchTab("library");

    flash(parts.length ? parts.join(" · ") : "Nada importado");
  };

  const handleSelectMiss = ({ date, title, slug }) => {
    setRepMissDate(date);
    setRepMissTitle(title || "");
    setRepMpmSlug(slug || "");
  };

  const useOracao = (secId, { text, songName }) => {
    if (!text?.trim()) {
      flash("Oração indisponível.", true);
      return;
    }
    const label = songName || SECTIONS.find((s) => s.id === secId)?.label || "Oração";
    if (secId.startsWith("oe")) {
      const next = { ...sections };
      for (const id of ["oe1", "oe2", "oe3", "oe4", "oe5"]) {
        if (id !== secId && next[id]) {
          next[id] = { ...next[id], included: false };
        }
      }
      next[secId] = initBlockWithContent({ included: true, songName: label, lyrics: text, key: "" });
      setCur(next);
    } else {
      upd(secId, {
        included: true,
        lyrics: text,
        songName: label,
        baseLyrics: text,
        baseKey: "",
        semitones: 0,
      });
    }
    setExpanded(secId);
    switchTab("build");
    flash(`"${label}" carregada na Montagem`);
  };

  const useOracoesProprias = (oracoesData) => {
    if (!oracoesData) return;
    let next = { ...sections };
    let loaded = 0;
    for (const item of ORACOES_PROPRIAS) {
      const text = oracoesData[item.cnbbKey];
      if (!text?.trim()) continue;
      next[item.id] = initBlockWithContent({
        included: true,
        songName: item.label,
        lyrics: text,
        key: "",
      });
      loaded += 1;
    }
    if (!loaded) {
      flash("Nenhuma oração própria disponível para esta data.", true);
      return;
    }
    setCur(next);
    switchTab("build");
    flash(`${loaded} oração(ões) do dia carregadas na Montagem`);
  };

  const loadOeTemplate = async (secId) => {
    try {
      const oe = await getOracaoEucaristica(secId);
      if (!oe?.text) {
        flash("Modelo indisponível.", true);
        return;
      }
      useOracao(secId, { text: oe.text, songName: oe.label });
    } catch {
      flash("Erro ao carregar Oração Eucarística.", true);
    }
  };

  const useSuggestedSong = async (secId, rawName) => {
    const name = cleanSongName(rawName);
    setSecQ((prev) => ({ ...prev, [secId]: name }));
    setExpanded(secId);
    switchTab("build");
    setSecBusy(secId);
    setSecFallback((prev) => ({ ...prev, [secId]: null }));
    try {
      const { lyrics, key, songName } = await fetchLyrics(name, "");
      if (lyrics) {
        setCur({
          ...sections,
          [secId]: initBlockWithContent({
            included: true,
            lyrics,
            songName: songName || name,
            key: key || "",
          }),
        });
        flash(`"${songName || name}" importada para ${SECTIONS.find((s) => s.id === secId)?.label}!`);
      } else {
        setCur({
          ...sections,
          [secId]: { ...sections[secId], included: true, songName: name },
        });
        setSecFallback((prev) => ({
          ...prev,
          [secId]: buildCifraClubSearchUrl(name, ""),
        }));
        flash(`Busca manual: "${name}" na seção ${SECTIONS.find((s) => s.id === secId)?.label}`);
      }
    } catch {
      flash("Erro ao buscar cifra.", true);
    }
    setSecBusy(null);
  };

  const saveRep = () => {
    if (!saveName.trim()) {
      flash("Dê um nome", true);
      return;
    }
    setReps([
      {
        id: Date.now().toString(),
        name: saveName.trim(),
        date: new Date().toLocaleDateString("pt-BR"),
        missDate: repMissDate.trim() || undefined,
        missTitle: repMissTitle.trim() || undefined,
        mpmSlug: repMpmSlug.trim() || undefined,
        sections: { ...sections },
      },
      ...savedReps,
    ]);
    setSaveName("");
    flash("Repertório salvo!");
  };

  const repSortKey = (rep) => {
    const raw = rep.missDate || rep.date || "01/01/1970";
    try {
      return parseBrDate(raw).getTime();
    } catch {
      return 0;
    }
  };

  const sortedSavedReps = [...savedReps].sort((a, b) => repSortKey(b) - repSortKey(a));

  const savedMonthOptions = useMemo(() => {
    const months = new Set();
    for (const r of savedReps) {
      const d = r.missDate || r.date;
      if (!d) continue;
      const parts = d.split("/");
      if (parts.length >= 3) months.add(`${parts[1]}/${parts[2]}`);
    }
    return [...months].sort((a, b) => {
      const [ma, ya] = a.split("/").map(Number);
      const [mb, yb] = b.split("/").map(Number);
      return yb - ya || mb - ma;
    });
  }, [savedReps]);

  const filteredSavedReps = savedFilterMonth
    ? sortedSavedReps.filter((r) => {
        const d = r.missDate || r.date || "";
        const parts = d.split("/");
        return parts.length >= 3 && `${parts[1]}/${parts[2]}` === savedFilterMonth;
      })
    : sortedSavedReps;

  const genDoc = () => genDocFor(sections, saveName.trim() || "missa");

  const genDocx = async () => {
    await genDocxFor(sections, saveName.trim() || "missa");
  };

  const repFilename = (name, ext) =>
    `canticos-${name.trim().replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9\-àáâãéêíóôõúç]/gi, "") || "missa"}${ext}`;

  const openPresentation = (sourceSections = null, repMeta = null) => {
    const src = mergeRepertoire(sourceSections ?? sections);
    if (!filledSections(src).length) {
      flash("Adicione letras primeiro", true);
      return;
    }
    setPresentSource(sourceSections ? src : null);
    setPresentRepId(repMeta?.id ?? null);
    setPresentMeta(
      repMeta ?? {
        missDate: repMissDate,
        missTitle: repMissTitle,
      }
    );
    setPresentOpen(true);
  };

  const closePresentation = () => {
    const src = presentSourceRef.current;
    const repId = presentRepId;
    if (src) {
      if (repId) {
        setReps((reps) =>
          reps.map((r) =>
            r.id === repId ? { ...r, sections: mergeRepertoire(src) } : r
          )
        );
      } else {
        setCur(mergeRepertoire(src));
      }
    }
    setPresentOpen(false);
    setPresentSource(null);
    setPresentRepId(null);
    setPresentMeta(null);
  };

  const genDocFor = (repSections, repName) => {
    const merged = mergeRepertoire(repSections);
    if (!filledSections(merged).length) {
      flash("Repertório sem letras", true);
      return;
    }
    downloadDoc(merged, repFilename(repName || "missa", ".doc"));
    flash("Documento .doc gerado!");
  };

  const genDocxFor = async (repSections, repName) => {
    const merged = mergeRepertoire(repSections);
    if (!filledSections(merged).length) {
      flash("Repertório sem letras", true);
      return;
    }
    setDocBusy(true);
    try {
      await downloadDocx(merged, repFilename(repName || "missa", ".docx"));
      flash("Documento .docx gerado!");
    } catch {
      flash("Erro ao gerar .docx", true);
    }
    setDocBusy(false);
  };

  const importLibrary = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const incoming = Array.isArray(data) ? data : data.library;
        if (!Array.isArray(incoming)) throw new Error("formato inválido");
        const byId = Object.fromEntries(library.map((s) => [s.id, s]));
        for (const song of incoming) {
          if (song.id && song.name && song.lyrics) byId[song.id] = song;
        }
        setLib(Object.values(byId));
        flash(`${incoming.length} música(s) importada(s)!`);
      } catch {
        flash("Arquivo JSON inválido", true);
      }
    };
    reader.readAsText(file);
  };

  const importRepertoire = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const stored = data.sections ?? data;
        setCur(mergeRepertoire(stored));
        switchTab("build");
        flash("Repertório importado!");
      } catch {
        flash("Arquivo JSON inválido", true);
      }
    };
    reader.readAsText(file);
  };

  const fLib = library.filter((s) => {
    const q = filter.toLowerCase();
    const match =
      !filter ||
      s.name.toLowerCase().includes(q) ||
      s.lyrics.toLowerCase().includes(q) ||
      (s.artist || "").toLowerCase().includes(q) ||
      (s.key || "").toLowerCase().includes(q);
    return match && (catFilter === "all" || s.category === catFilter);
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg, fontFamily: FONT }}>
        <p style={{ color: C.textMuted }}>Carregando...</p>
      </div>
    );
  }

  const cnt = filledSections(sections).length;
  const inp = { fontFamily: FONT };
  const btn = (bg, col) => ({ background: bg, color: col, fontFamily: FONT });
  const sm = (bg, col) => ({ ...btn(bg, col) });

  const FallbackLink = ({ url }) =>
    url ? (
      <div style={{ background: "#FFF8E7", border: "1px solid #E8D48B", borderRadius: 6, padding: 10, marginTop: 8, fontSize: 12 }}>
        <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#8B6914" }}>Abra no Cifra Club, copie a cifra e cole abaixo:</p>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.search, wordBreak: "break-all", fontSize: 12 }}>{url}</a>
      </div>
    ) : null;

  const activeSections = presentSource ?? sections;

  const presentationSlides = presentOpen
    ? filledSections(activeSections).map((s) => {
        const block = activeSections[s.id];
        return {
          id: s.id,
          label: s.label,
          songName: block.songName,
          lyrics: block.lyrics.trim(),
          key: block.key || "",
          percTab: block.percTab || "",
          percTabDraw: block.percTabDraw || "",
        };
      })
    : [];

  const presentationContextKey = presentOpen
    ? buildPresentationContextKey(presentationSlides, {
        repId: presentRepId,
        missDate: presentMeta?.missDate ?? repMissDate,
        missTitle: presentMeta?.missTitle ?? repMissTitle,
      })
    : "";

  return (
    <div className="app-shell" style={{ fontFamily: FONT, color: C.text }}>
      <input ref={importLibRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={importLibrary} />
      <input ref={importRepRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={importRepertoire} />

      {presentOpen && (
        <PresentationMode
          slides={presentationSlides}
          contextKey={presentationContextKey}
          onClose={closePresentation}
          onTranspose={transposeSection}
          onSetKey={setSectionToKey}
          onTabChange={updatePercTab}
          onTabDrawChange={updatePercTabDraw}
          onRestoreKeys={restorePresentationKeys}
        />
      )}

      <PdfImportModal
        open={pdfImportOpen}
        onClose={() => setPdfImportOpen(false)}
        onImport={handlePdfImport}
        defaultTitle={pdfDefaults.title}
        defaultDate={pdfDefaults.date}
      />

      {toast && (
        <div className="app-toast" style={{ background: toast.err ? C.danger : C.success, color: "#fff" }} role="status">
          {toast.msg}
        </div>
      )}

      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand">
            <h1 className="app-header__title">♪ Cânticos da Missa</h1>
            <p className="app-header__subtitle">Montagem de repertório litúrgico</p>
          </div>
          <AppNav tab={tab} onTab={switchTab} libraryCount={library.length} savedCount={savedReps.length} variant="desktop" />
        </div>
      </header>

      <main className="app-main">
        {tab === "home" && (
          <LiturgyDashboard
            onUseSong={useSuggestedSong}
            onImportPdf={openPdfImport}
            onSelectMiss={handleSelectMiss}
            onUseOracao={useOracao}
            onUseOracoesProprias={useOracoesProprias}
            savedReps={savedReps}
          />
        )}

        {tab === "build" && (
          <div>
            <div className="page-toolbar">
              <span className="page-toolbar__meta">{cnt} seção(ões) preenchida(s)</span>
              <div className="action-grid">
                <button type="button" className="btn btn-sm" onClick={() => openPresentation()} disabled={!cnt} style={sm(cnt ? C.nav : "#eee", cnt ? C.navText : "#aaa")}>▶ Apresentar</button>
                <button type="button" className="btn btn-sm btn--ghost" onClick={() => openPdfImport()}>Importar doc</button>
                <button type="button" className="btn btn-sm btn--ghost" onClick={() => importRepRef.current?.click()}>Importar JSON</button>
                <button type="button" className="btn btn-sm btn--ghost" onClick={() => downloadJson({ sections }, "repertorio-atual.json")}>Exportar</button>
                <button type="button" className="btn btn-sm btn--ghost" onClick={() => { setCur(emptyRepertoire()); setSecQ({}); setSecA({}); setSecFallback({}); flash("Limpo!"); }}>Limpar tudo</button>
              </div>
            </div>

            {SECTIONS.map((sec) => {
              const d = sections[sec.id] || { included: false, lyrics: "", songName: "" };
              const open = expanded === sec.id;
              const has = d.lyrics?.trim();
              const isBusy = secBusy === sec.id;
              const liturgical = isLiturgicalSection(sec);

              return (
                <div key={sec.id} className={`section-card${d.included && has ? " section-card--filled" : ""}`}>
                  <div className="section-card__head" onClick={() => setExpanded(open ? null : sec.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                      <input type="checkbox" checked={d.included} onChange={(e) => { e.stopPropagation(); upd(sec.id, { included: !d.included }); }} onClick={(e) => e.stopPropagation()} />
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: d.included ? C.text : C.textMuted }}>{sec.label}</span>
                        {d.songName && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>— {d.songName}</span>}
                        {d.key && <span style={{ fontSize: 10, color: C.search, marginLeft: 6, fontWeight: 600 }}>{d.key}</span>}
                      </div>
                      {has && <span style={{ background: C.successBg, color: C.success, fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 600, flexShrink: 0 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: C.textMuted, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} aria-hidden>▼</span>
                  </div>

                  {open && (
                    <div className="section-card__body">
                      {liturgical ? (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.search, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {sec.kind === "oe" ? "📖 Oração Eucarística" : "📖 Oração litúrgica"}
                          </div>
                          {sec.kind === "oe" && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => loadOeTemplate(sec.id)}
                              style={{ ...sm(C.nav, C.navText), marginBottom: 8 }}
                            >
                              Carregar modelo {sec.label}
                            </button>
                          )}
                          <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 8px", lineHeight: 1.4 }}>
                            {sec.kind === "oe"
                              ? "Pe: celebrante · T: assembleia. Inclua o Prefácio do dia. Use na apresentação para acompanhar a liturgia eucarística."
                              : "Carregue do calendário (aba Início) ou cole o texto do missal."}
                          </p>
                        </div>
                      ) : (
                      <div className="search-box">
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.search, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>🔍 Buscar no Cifra Club</div>
                        <div className="search-box__fields">
                          <input className="inp" value={secQ[sec.id] || ""} onChange={(e) => setSecQ({ ...secQ, [sec.id]: e.target.value })} placeholder="Nome da música" onKeyDown={(e) => e.key === "Enter" && doSearch(sec.id)} style={{ ...inp, flex: 2 }} />
                          <input className="inp" value={secA[sec.id] || ""} onChange={(e) => setSecA({ ...secA, [sec.id]: e.target.value })} placeholder="Artista" onKeyDown={(e) => e.key === "Enter" && doSearch(sec.id)} style={{ ...inp, flex: 1 }} />
                          <button type="button" className="btn" onClick={() => doSearch(sec.id)} disabled={isBusy} style={btn(isBusy ? C.textMuted : C.search, "#fff")}>{isBusy ? "Buscando..." : "Buscar"}</button>
                        </div>
                        <FallbackLink url={secFallback[sec.id]} />
                      </div>
                      )}
                      <input
                        className="inp"
                        value={d.songName || ""}
                        onChange={(e) => upd(sec.id, { songName: e.target.value })}
                        placeholder={liturgical ? "Título (opcional)" : "Nome da música (no folheto/apresentação)"}
                        style={{ ...inp, marginBottom: 8 }}
                      />
                      {!liturgical && (
                      <TransposeControls
                        keyLabel={d.key}
                        semitones={d.semitones ?? 0}
                        hasContent={!!has}
                        onDownHalf={() => transposeSection(sec.id, -1)}
                        onUpHalf={() => transposeSection(sec.id, 1)}
                        onDownWhole={() => transposeSection(sec.id, -2)}
                        onUpWhole={() => transposeSection(sec.id, 2)}
                        onSelectKey={(semi) => setSectionToKey(sec.id, semi)}
                        onReset={() => resetSectionTranspose(sec.id)}
                      />
                      )}
                      {!liturgical && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                        <label className="label-sm" style={{ marginBottom: 0, flexShrink: 0 }}>Tom:</label>
                        <input
                          className="inp"
                          value={d.key || ""}
                          onChange={(e) => upd(sec.id, { key: e.target.value })}
                          placeholder="Ex: Sol (G)"
                          style={inp}
                        />
                      </div>
                      )}
                      <textarea className="inp" value={d.lyrics} onChange={(e) => upd(sec.id, { lyrics: e.target.value })} placeholder={sectionPlaceholder(sec) || CIFRA_PLACEHOLDER} style={{ ...inp, minHeight: liturgical ? 240 : 180, ...cifraStyle(d.lyrics) }} />
                      <div className="toolbar" style={{ marginTop: 8 }}>
                        <button type="button" className="btn btn-sm" disabled={!has} onClick={() => saveSectionToLib(sec.id)} style={sm(has ? C.goldLight : "#eee", has ? C.nav : "#aaa")}>Salvar na biblioteca</button>
                        <button type="button" className="btn btn-sm btn--ghost" disabled={!has} onClick={() => { upd(sec.id, { lyrics: "", songName: "", key: "", baseLyrics: "", baseKey: "", semitones: 0 }); setSecFallback((prev) => ({ ...prev, [sec.id]: null })); }}>Limpar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="card" style={{ marginTop: 16 }}>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <input className="inp" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Nome do repertório (ex: Missa 22/06)" style={inp} />
                <button type="button" className="btn btn--block" onClick={saveRep} style={btn(C.nav, C.navText)}>Salvar repertório</button>
              </div>
              <div className="form-row form-row--2" style={{ marginBottom: 10 }}>
                <div>
                  <label className="label-sm">Data da missa</label>
                  <input className="inp" value={repMissDate} onChange={(e) => setRepMissDate(e.target.value)} placeholder="DD/MM/AAAA" style={inp} />
                </div>
                <div>
                  <label className="label-sm">Liturgia</label>
                  <input className="inp" value={repMissTitle} onChange={(e) => setRepMissTitle(e.target.value)} placeholder="Ex: 12º Domingo do Tempo Comum" style={inp} />
                </div>
              </div>
              {(repMissDate || repMissTitle) && (
                <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 10px" }}>
                  Histórico litúrgico preenchido a partir do calendário da aba Início.
                </p>
              )}
              <div className="form-row">
                <button type="button" className="btn btn--block" onClick={genDoc} style={{ ...btn(C.gold, C.nav), padding: 12, fontSize: 14, fontWeight: 700 }}>Gerar documento .doc</button>
                <button type="button" className="btn btn--block" onClick={genDocx} disabled={docBusy} style={btn(docBusy ? C.textMuted : C.nav, C.navText)}>{docBusy ? "Gerando..." : "Gerar documento .docx"}</button>
              </div>
            </div>
          </div>
        )}

        {tab === "library" && (
          <div>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.nav }}>{editing ? "Editar música" : "Adicionar música"}</h3>
              <div className="search-box__fields" style={{ marginBottom: 8 }}>
                <input className="inp" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Nome da música" style={inp} />
                <input className="inp" value={sArtist} onChange={(e) => setSArtist(e.target.value)} placeholder="Artista" style={inp} />
                <input className="inp" value={sKey} onChange={(e) => syncLibKey(e.target.value)} placeholder="Tom (ex: Sol (G))" style={{ ...inp, maxWidth: 160 }} />
              </div>
              <select className="inp" value={sCat} onChange={(e) => setSCat(e.target.value)} style={{ ...inp, marginBottom: 8 }}>
                {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <button type="button" className="btn btn--block" onClick={doLibSearch} disabled={busy || !sName.trim()} style={{ ...btn(busy ? C.textMuted : C.search, "#fff"), marginBottom: 8 }}>{busy ? "Buscando..." : "Buscar no Cifra Club"}</button>
              <FallbackLink url={fallbackUrl} />
              <textarea className="inp" value={sLyrics} onChange={(e) => syncLibLyrics(e.target.value)} placeholder={CIFRA_PLACEHOLDER} style={{ ...inp, marginTop: fallbackUrl ? 8 : 0, ...cifraStyle(sLyrics) }} />
              <TransposeControls
                keyLabel={sKey}
                semitones={sSemitones}
                hasContent={!!sLyrics.trim()}
                onDownHalf={() => libTranspose(-1)}
                onUpHalf={() => libTranspose(1)}
                onDownWhole={() => libTranspose(-2)}
                onUpWhole={() => libTranspose(2)}
                onSelectKey={libSetToKey}
                onReset={libResetTranspose}
                compact
              />
              <div className="toolbar" style={{ marginTop: 8 }}>
                <button type="button" className="btn" onClick={() => addToLib()} style={{ ...btn(C.gold, C.nav), flex: 1 }}>{editing ? "Atualizar" : "Salvar na biblioteca"}</button>
                {editing && <button type="button" className="btn btn--ghost" onClick={resetLibForm}>Cancelar</button>}
              </div>
            </div>

            {library.length > 0 && (
              <div className="toolbar" style={{ marginBottom: 12 }}>
                <button type="button" className="btn btn-sm btn--ghost" onClick={() => downloadJson(library, "biblioteca.json")}>Exportar biblioteca</button>
                <button type="button" className="btn btn-sm btn--ghost" onClick={() => importLibRef.current?.click()}>Importar biblioteca</button>
              </div>
            )}

            {library.length > 0 && (
              <div className="library-filters" style={{ marginBottom: 12 }}>
                <input className="inp" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar na biblioteca..." style={inp} />
                <label className="label-sm" htmlFor="lib-cat-filter">Seção litúrgica</label>
                <select
                  id="lib-cat-filter"
                  className="inp"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  style={inp}
                >
                  <option value="all">Todas ({library.length})</option>
                  {SECTIONS.map((s) => {
                    const n = library.filter((l) => l.category === s.id).length;
                    if (!n) return null;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.label} ({n})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {!fLib.length && library.length > 0 && <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: 20 }}>Nenhuma música encontrada</p>}
            {!library.length && <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: 20 }}>Biblioteca vazia. Busque ou cole uma música acima.</p>}

            {fLib.map((song) => {
              const sl = SECTIONS.find((s) => s.id === song.category)?.label || song.category;
              return (
                <div key={song.id} className="card" style={{ padding: 12 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{song.name}</span>
                    {song.artist && <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>— {song.artist}</span>}
                    {song.key && <span style={{ fontSize: 11, color: C.search, marginLeft: 6, fontWeight: 600 }}>Tom: {song.key}</span>}
                    <span style={{ background: C.goldLight, color: C.nav, fontSize: 10, padding: "2px 6px", borderRadius: 4, marginLeft: 8, fontWeight: 600 }}>{sl}</span>
                  </div>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: "6px 0 8px", whiteSpace: "pre-line", maxHeight: 60, overflow: "hidden", lineHeight: 1.4 }}>{song.lyrics.substring(0, 150)}{song.lyrics.length > 150 ? "..." : ""}</p>
                  <div className="action-grid">
                    <button type="button" className="btn btn-sm" onClick={() => useInSection(song)} style={sm(C.success, "#fff")}>Usar</button>
                    <button type="button" className="btn btn-sm btn--ghost" onClick={() => { setEditing(song); setSName(song.name); setSArtist(song.artist || ""); setSKey(song.key || ""); setSBaseLyrics(song.baseLyrics ?? song.lyrics); setSBaseKey(song.baseKey ?? song.key ?? ""); setSSemitones(song.semitones ?? 0); setSCat(song.category); setSLyrics(song.lyrics); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                    {deletingLib === song.id ? (
                      <>
                        <button onClick={() => { setLib(library.filter((s) => s.id !== song.id)); setDeletingLib(null); flash("Removida"); }} style={sm(C.danger, "#fff")}>Confirmar</button>
                        <button onClick={() => setDeletingLib(null)} style={{ ...sm("none", C.textMuted), border: `1px solid ${C.border}` }}>Não</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingLib(song.id)} style={{ ...sm("none", C.danger), border: `1px solid ${C.dangerBg}` }}>Excluir</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "saved" && (
          <div>
            {!savedReps.length ? (
              <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: 40 }}>Nenhum repertório salvo. Monte um na aba Montar e salve.</p>
            ) : (
              <>
                {savedMonthOptions.length > 1 && (
                  <div style={{ marginBottom: 12 }}>
                    <select className="inp" value={savedFilterMonth} onChange={(e) => setSavedFilterMonth(e.target.value)}>
                      <option value="">Todas as missas</option>
                      {savedMonthOptions.map((m) => {
                        const [mo, yr] = m.split("/");
                        const label = `${["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][Number(mo)]}/${yr}`;
                        return (
                          <option key={m} value={m}>{label}</option>
                        );
                      })}
                    </select>
                  </div>
                )}
                {filteredSavedReps.map((rep) => {
                const n = filledSections(rep.sections).length;
                const names = filledSections(rep.sections).map((s) => rep.sections[s.id].songName).filter(Boolean).slice(0, 3);
                return (
                  <div key={rep.id} className="card">
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{rep.name}</span>
                    {rep.missDate && (
                      <p style={{ fontSize: 12, color: C.nav, margin: "4px 0 0", fontWeight: 600 }}>
                        Missa: {rep.missDate}
                        {rep.missTitle ? ` — ${rep.missTitle}` : ""}
                      </p>
                    )}
                    <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>
                      Salvo em {rep.date} — {n} seções
                    </p>
                    {names.length > 0 && <p style={{ fontSize: 11, color: C.textMuted, margin: "2px 0 0", fontStyle: "italic" }}>{names.join(", ")}{names.length < n ? "..." : ""}</p>}
                    <div className="action-grid" style={{ marginTop: 10 }}>
                      <button type="button" className="btn btn-sm" onClick={() => { setCur(mergeRepertoire(rep.sections)); setRepMissDate(rep.missDate || ""); setRepMissTitle(rep.missTitle || ""); setRepMpmSlug(rep.mpmSlug || ""); setSaveName(rep.name); switchTab("build"); flash(`"${rep.name}" carregado`); }} style={sm(C.gold, C.nav)}>Carregar</button>
                      <button type="button" className="btn btn-sm" onClick={() => openPresentation(rep.sections, { id: rep.id, missDate: rep.missDate, missTitle: rep.missTitle })} disabled={!n} style={sm(n ? C.nav : "#eee", n ? C.navText : "#aaa")}>▶ Apresentar</button>
                      <button type="button" className="btn btn-sm" onClick={() => genDocFor(rep.sections, rep.name)} disabled={!n} style={sm(n ? C.search : "#eee", n ? "#fff" : "#aaa")}>.doc</button>
                      <button type="button" className="btn btn-sm" onClick={() => genDocxFor(rep.sections, rep.name)} disabled={!n || docBusy} style={sm(n && !docBusy ? C.search : "#eee", n && !docBusy ? "#fff" : "#aaa")}>.docx</button>
                      <button type="button" className="btn btn-sm btn--ghost" onClick={() => downloadJson(rep, `repertorio-${rep.name.replace(/\s+/g, "-").toLowerCase()}.json`)}>Exportar</button>
                      {deletingRep === rep.id ? (
                        <>
                          <button onClick={() => { setReps(savedReps.filter((r) => r.id !== rep.id)); setDeletingRep(null); flash("Excluído"); }} style={sm(C.danger, "#fff")}>Confirmar</button>
                          <button onClick={() => setDeletingRep(null)} style={{ ...sm("none", C.textMuted), border: `1px solid ${C.border}` }}>Não</button>
                        </>
                      ) : (
                        <button onClick={() => setDeletingRep(rep.id)} style={{ ...sm("none", C.danger), border: `1px solid ${C.dangerBg}` }}>Excluir</button>
                      )}
                    </div>
                  </div>
                );
              })}
              </>
            )}
          </div>
        )}
      </main>

      <AppNav tab={tab} onTab={switchTab} libraryCount={library.length} savedCount={savedReps.length} variant="mobile" />
    </div>
  );
}
