import { useState, useEffect, useCallback } from "react";

const SECTIONS = [
  { id: "refrao", label: "Refrão Orante", optional: true },
  { id: "entrada", label: "Entrada" },
  { id: "ato", label: "Ato Penitencial" },
  { id: "gloria", label: "Hino de Louvor (Glória)" },
  { id: "salmo", label: "Salmo Responsorial", optional: true },
  { id: "aclamacao", label: "Aclamação" },
  { id: "ofertorio", label: "Ofertório" },
  { id: "santo", label: "Santo" },
  { id: "cordeiro", label: "Cordeiro", optional: true },
  { id: "comunhao", label: "Comunhão" },
  { id: "pos", label: "Pós-Comunhão", optional: true },
  { id: "consagracao", label: "Consagração", optional: true },
  { id: "final", label: "Canto Final" },
  { id: "final2", label: "Canto Final 2", optional: true },
];

const emptyRepertoire = () => {
  const s = {};
  SECTIONS.forEach((sec) => { s[sec.id] = { included: !sec.optional, lyrics: "", songName: "" }; });
  return s;
};

const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
const C = {
  bg: "#FAF8F5", card: "#FFFFFF", nav: "#1B2A4A", navText: "#E8E4DF",
  gold: "#C9A84C", goldLight: "#F5EFD8", text: "#2D2D2D", textMuted: "#6B6B6B",
  border: "#E2DED8", danger: "#B54A4A", dangerBg: "#FDF0F0",
  success: "#4A7C59", successBg: "#EDF5EF", search: "#4A5A8C", searchBg: "#EEF0F8",
};

function slugify(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function fetchLyrics(name, artist) {
  const q = artist ? name + " " + artist : name;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: "Você é um assistente que ajuda coordenadores de música litúrgica católica a encontrar textos de hinos e cânticos para preparar folhetos da Missa. Quando solicitado, busque o texto completo do hino na web (letras.mus.br, vagalume.com.br, cifraclub.com.br) e retorne-o formatado com quebras de linha entre versos e linhas em branco entre estrofes. Retorne SOMENTE o texto do hino, sem título, sem nome de artista, sem comentários, sem acordes. Se não encontrar, responda apenas: NAO_ENCONTRADA",
        messages: [{ role: "user", content: "Busque o texto completo do hino litúrgico católico: \"" + q + "\". Acesse a página no letras.mus.br e extraia o texto completo. Retorne apenas o texto formatado." }],
      }),
    });
    const d = await r.json();
    const txt = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    if (!txt || txt.includes("NAO_ENCONTRADA") || txt.length < 30) return { lyrics: null, url: null };
    const urlMatch = txt.match(/letras\.mus\.br\/[^\s)]+/);
    const url = urlMatch ? "https://www." + urlMatch[0] : null;
    return { lyrics: txt, url };
  } catch (e) {
    return { lyrics: null, url: null };
  }
}

function buildLetrasUrl(name, artist) {
  if (artist) return "https://www.letras.mus.br/" + slugify(artist) + "/" + slugify(name) + "/";
  return "https://www.letras.mus.br/letras/?q=" + encodeURIComponent(name);
}

export default function App() {
  const [tab, setTab] = useState("build");
  const [sections, setSections] = useState(emptyRepertoire());
  const [library, setLibrary] = useState([]);
  const [savedReps, setSavedReps] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [sName, setSName] = useState("");
  const [sArtist, setSArtist] = useState("");
  const [sCat, setSCat] = useState("entrada");
  const [sLyrics, setSLyrics] = useState("");
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [secBusy, setSecBusy] = useState(null);
  const [secQ, setSecQ] = useState({});
  const [secA, setSecA] = useState({});
  const [fallbackUrl, setFallbackUrl] = useState(null);
  const [secFallback, setSecFallback] = useState({});

  const flash = useCallback((msg, err) => { setToast({ msg, err }); setTimeout(() => setToast(null), 4000); }, []);

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("lib"); if (r) setLibrary(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get("reps"); if (r) setSavedReps(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get("cur"); if (r) setSections(JSON.parse(r.value)); } catch {}
      setLoading(false);
    })();
  }, []);

  const persist = async (k, v, setter) => { setter(v); try { await window.storage.set(k, JSON.stringify(v)); } catch {} };
  const setLib = v => persist("lib", v, setLibrary);
  const setCur = v => persist("cur", v, setSections);
  const setReps = v => persist("reps", v, setSavedReps);
  const upd = (id, fields) => { const u = { ...sections, [id]: { ...sections[id], ...fields } }; setCur(u); };

  const doSearch = async (secId) => {
    const nm = secQ[secId]?.trim();
    const ar = secA[secId]?.trim();
    if (!nm) { flash("Digite o nome da música", true); return; }
    setSecBusy(secId);
    setSecFallback(prev => ({ ...prev, [secId]: null }));
    try {
      const { lyrics } = await fetchLyrics(nm, ar);
      if (lyrics) {
        setCur({ ...sections, [secId]: { included: true, lyrics, songName: nm } });
        flash('Letra de "' + nm + '" encontrada!');
      } else {
        setSecFallback(prev => ({ ...prev, [secId]: buildLetrasUrl(nm, ar) }));
        flash("Não foi possível extrair automaticamente. Use o link abaixo.", true);
      }
    } catch { flash("Erro na busca.", true); }
    setSecBusy(null);
  };

  const doLibSearch = async () => {
    if (!sName.trim()) { flash("Digite o nome", true); return; }
    setBusy(true);
    setFallbackUrl(null);
    try {
      const { lyrics } = await fetchLyrics(sName, sArtist);
      if (lyrics) { setSLyrics(lyrics); flash("Letra encontrada! Revise e salve."); }
      else {
        setFallbackUrl(buildLetrasUrl(sName, sArtist));
        flash("Não foi possível extrair. Use o link abaixo.", true);
      }
    } catch { flash("Erro na busca.", true); }
    setBusy(false);
  };

  const addToLib = (override) => {
    const name = (override?.name ?? sName).trim();
    const artist = (override?.artist ?? sArtist).trim();
    const category = override?.category ?? sCat;
    const lyrics = (override?.lyrics ?? sLyrics).trim();
    if (!name || !lyrics) { flash("Preencha nome e letra", true); return; }
    const e = { id: editing ? editing.id : Date.now().toString(), name, artist, category, lyrics };
    if (editing) { setLib(library.map(s => s.id === editing.id ? e : s)); setEditing(null); flash("Atualizada!"); }
    else { setLib([...library, e]); flash("Salva na biblioteca!"); }
    setSName(""); setSArtist(""); setSLyrics(""); setSCat("entrada"); setFallbackUrl(null);
  };

  const saveSectionToLib = (secId) => {
    const d = sections[secId];
    const name = d.songName?.trim() || secQ[secId]?.trim();
    if (!name || !d.lyrics?.trim()) { flash("Preencha nome e letra", true); return; }
    addToLib({ name, artist: secA[secId]?.trim() || "", category: secId, lyrics: d.lyrics });
  };

  const useInSection = (song) => {
    setCur({ ...sections, [song.category]: { included: true, lyrics: song.lyrics, songName: song.name } });
    setTab("build"); flash('"' + song.name + '" inserida!');
  };

  const saveRep = () => {
    if (!saveName.trim()) { flash("Dê um nome", true); return; }
    setReps([{ id: Date.now().toString(), name: saveName.trim(), date: new Date().toLocaleDateString("pt-BR"), sections: { ...sections } }, ...savedReps]);
    setSaveName(""); flash("Repertório salvo!");
  };

  const genDoc = () => {
    const inc = SECTIONS.filter(s => sections[s.id]?.included && sections[s.id]?.lyrics?.trim());
    if (!inc.length) { flash("Adicione letras primeiro", true); return; }
    let h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page{size:A4;margin:2cm}body{font-family:Arial,sans-serif;font-size:11pt;color:#333;margin:2cm}h1{font-size:16pt;font-weight:bold;text-align:center;margin-bottom:24pt}h2{font-size:12pt;font-weight:bold;text-transform:uppercase;margin-top:18pt;margin-bottom:10pt}p{margin:2pt 0;line-height:1.4}.g{margin:8pt 0}</style></head><body><h1>Cânticos da Missa</h1>';
    inc.forEach(s => {
      h += '<h2>' + escapeHtml(s.label) + '</h2>';
      sections[s.id].lyrics.trim().split("\n").forEach(l => { h += l.trim() === "" ? '<p class="g">&nbsp;</p>' : '<p>' + escapeHtml(l) + '</p>'; });
    });
    h += '</body></html>';
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h], { type: "application/msword" }));
    a.download = "canticos-da-missa.doc"; a.click(); flash("Documento gerado!");
  };

  const fLib = library.filter(s => {
    const m1 = !filter || s.name.toLowerCase().includes(filter.toLowerCase()) || s.lyrics.toLowerCase().includes(filter.toLowerCase()) || (s.artist || "").toLowerCase().includes(filter.toLowerCase());
    return m1 && (catFilter === "all" || s.category === catFilter);
  });

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg, fontFamily: FONT }}><p style={{ color: C.textMuted }}>Carregando...</p></div>;

  const cnt = SECTIONS.filter(s => sections[s.id]?.included && sections[s.id]?.lyrics?.trim()).length;
  const inp = { padding: "8px 10px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, fontFamily: FONT, outline: "none", boxSizing: "border-box" };
  const btn = (bg, col) => ({ background: bg, color: col, border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" });
  const sm = (bg, col) => ({ ...btn(bg, col), padding: "5px 10px", fontSize: 11 });

  const FallbackLink = ({ url }) => url ? (
    <div style={{ background: "#FFF8E7", border: "1px solid #E8D48B", borderRadius: 6, padding: 10, marginTop: 8, fontSize: 12 }}>
      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#8B6914" }}>Abra o link, copie a letra e cole no campo abaixo:</p>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.search, wordBreak: "break-all", fontSize: 12 }}>{url}</a>
    </div>
  ) : null;

  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh", color: C.text }}>
      {toast && <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: toast.err ? C.danger : C.success, color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 14, zIndex: 999, boxShadow: "0 4px 12px rgba(0,0,0,.15)", maxWidth: "90%", textAlign: "center" }}>{toast.msg}</div>}

      <div style={{ background: C.nav, padding: "16px 20px", position: "sticky", top: 0, zIndex: 50 }}>
        <h1 style={{ color: C.gold, fontSize: 18, fontWeight: 700, margin: 0 }}>♪ Cânticos da Missa</h1>
        <p style={{ color: C.navText, fontSize: 12, margin: "4px 0 12px", opacity: .7 }}>Montagem de repertório litúrgico</p>
        <div style={{ display: "flex", gap: 4 }}>
          {[["build","Montar"],["library","Biblioteca"],["saved","Salvos"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", background: tab === k ? C.gold : "rgba(255,255,255,.08)", color: tab === k ? C.nav : C.navText }}>
              {l}{k === "library" && library.length ? ` (${library.length})` : ""}{k === "saved" && savedReps.length ? ` (${savedReps.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {tab === "build" && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>{cnt} seção(ões) preenchida(s)</span>
            <button onClick={() => { setCur(emptyRepertoire()); setSecQ({}); setSecA({}); setSecFallback({}); flash("Limpo!"); }} style={{ background: "none", border: "1px solid " + C.border, borderRadius: 6, padding: "6px 12px", fontSize: 12, color: C.textMuted, cursor: "pointer" }}>Limpar tudo</button>
          </div>

          {SECTIONS.map(sec => {
            const d = sections[sec.id] || { included: false, lyrics: "", songName: "" };
            const open = expanded === sec.id;
            const has = d.lyrics?.trim();
            const isBusy = secBusy === sec.id;

            return <div key={sec.id} style={{ background: C.card, borderRadius: 8, marginBottom: 8, border: "1px solid " + (d.included && has ? C.gold + "60" : C.border), overflow: "hidden" }}>
              <div onClick={() => setExpanded(open ? null : sec.id)} style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <input type="checkbox" checked={d.included} onChange={e => { e.stopPropagation(); upd(sec.id, { included: !d.included }); }} onClick={e => e.stopPropagation()} style={{ accentColor: C.gold, width: 16, height: 16, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: d.included ? C.text : C.textMuted }}>{sec.label}</span>
                    {d.songName && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>— {d.songName}</span>}
                  </div>
                  {has && <span style={{ background: C.successBg, color: C.success, fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 600, flexShrink: 0 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: C.textMuted, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>▼</span>
              </div>

              {open && <div style={{ padding: "0 14px 14px" }}>
                <div style={{ background: C.searchBg, borderRadius: 6, padding: 10, marginBottom: 10, border: "1px solid " + C.search + "30" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.search, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>🔍 Buscar letra</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <input value={secQ[sec.id] || ""} onChange={e => setSecQ({ ...secQ, [sec.id]: e.target.value })} placeholder="Nome da música" onKeyDown={e => e.key === "Enter" && doSearch(sec.id)} style={{ ...inp, flex: 2, minWidth: 120, background: "#fff" }} />
                    <input value={secA[sec.id] || ""} onChange={e => setSecA({ ...secA, [sec.id]: e.target.value })} placeholder="Artista" onKeyDown={e => e.key === "Enter" && doSearch(sec.id)} style={{ ...inp, flex: 1, minWidth: 100, background: "#fff" }} />
                    <button onClick={() => doSearch(sec.id)} disabled={isBusy} style={{ ...btn(isBusy ? C.textMuted : C.search, "#fff"), minWidth: 80, cursor: isBusy ? "wait" : "pointer" }}>{isBusy ? "Buscando..." : "Buscar"}</button>
                  </div>
                  <FallbackLink url={secFallback[sec.id]} />
                </div>

                <textarea value={d.lyrics} onChange={e => upd(sec.id, { lyrics: e.target.value })} placeholder="A letra aparecerá aqui após a busca, ou cole/digite manualmente..." style={{ ...inp, width: "100%", minHeight: 150, resize: "vertical", lineHeight: 1.6 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <button disabled={!has} onClick={() => saveSectionToLib(sec.id)} style={{ ...sm(has ? C.goldLight : "#eee", has ? C.nav : "#aaa"), cursor: has ? "pointer" : "default" }}>Salvar na biblioteca</button>
                  <button disabled={!has} onClick={() => { upd(sec.id, { lyrics: "", songName: "" }); setSecFallback(prev => ({ ...prev, [sec.id]: null })); }} style={{ ...sm("none", C.textMuted), border: "1px solid " + C.border, cursor: has ? "pointer" : "default" }}>Limpar</button>
                </div>
              </div>}
            </div>;
          })}

          <div style={{ background: C.card, borderRadius: 8, padding: 14, marginTop: 16, border: "1px solid " + C.border }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Nome do repertório (ex: Missa 22/06)" style={{ ...inp, flex: 1 }} />
              <button onClick={saveRep} style={btn(C.nav, C.navText)}>Salvar</button>
            </div>
            <button onClick={genDoc} style={{ ...btn(C.gold, C.nav), width: "100%", padding: 12, fontSize: 14, fontWeight: 700, letterSpacing: .3 }}>Gerar documento .doc</button>
          </div>
        </div>}

        {tab === "library" && <div>
          <div style={{ background: C.card, borderRadius: 8, padding: 14, marginBottom: 16, border: "1px solid " + C.border }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.nav }}>{editing ? "Editar música" : "Adicionar música"}</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={sName} onChange={e => setSName(e.target.value)} placeholder="Nome da música" style={{ ...inp, flex: 2 }} />
              <input value={sArtist} onChange={e => setSArtist(e.target.value)} placeholder="Artista" style={{ ...inp, flex: 1 }} />
            </div>
            <select value={sCat} onChange={e => setSCat(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 8, background: "#fff" }}>
              {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button onClick={doLibSearch} disabled={busy || !sName.trim()} style={{ ...btn(busy ? C.textMuted : C.search, "#fff"), width: "100%", marginBottom: 8, cursor: busy ? "wait" : "pointer" }}>{busy ? "🔍 Buscando..." : "🔍 Buscar letra automaticamente"}</button>
            <FallbackLink url={fallbackUrl} />
            <textarea value={sLyrics} onChange={e => setSLyrics(e.target.value)} placeholder="Cole a letra aqui ou use a busca acima..." style={{ ...inp, width: "100%", minHeight: 150, resize: "vertical", lineHeight: 1.6, marginTop: fallbackUrl ? 8 : 0 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => addToLib()} style={{ ...btn(C.gold, C.nav), flex: 1 }}>{editing ? "Atualizar" : "Salvar na biblioteca"}</button>
              {editing && <button onClick={() => { setEditing(null); setSName(""); setSArtist(""); setSLyrics(""); setSCat("entrada"); setFallbackUrl(null); }} style={{ ...btn("none", C.textMuted), border: "1px solid " + C.border }}>Cancelar</button>}
            </div>
          </div>

          {library.length > 0 && <div style={{ marginBottom: 12 }}>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar na biblioteca..." style={{ ...inp, width: "100%", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button onClick={() => setCatFilter("all")} style={{ padding: "4px 10px", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer", background: catFilter === "all" ? C.gold : C.border, color: catFilter === "all" ? C.nav : C.textMuted, fontWeight: 600 }}>Todas</button>
              {SECTIONS.map(s => {
                const n = library.filter(l => l.category === s.id).length;
                if (!n) return null;
                return <button key={s.id} onClick={() => setCatFilter(s.id)} style={{ padding: "4px 10px", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer", background: catFilter === s.id ? C.gold : C.border, color: catFilter === s.id ? C.nav : C.textMuted, fontWeight: 600 }}>{s.label} ({n})</button>;
              })}
            </div>
          </div>}

          {!fLib.length && library.length > 0 && <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: 20 }}>Nenhuma música encontrada</p>}
          {!library.length && <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: 20 }}>Biblioteca vazia. Busque ou cole uma música acima.</p>}

          {fLib.map(song => {
            const sl = SECTIONS.find(s => s.id === song.category)?.label || song.category;
            return <div key={song.id} style={{ background: C.card, borderRadius: 8, padding: 12, marginBottom: 8, border: "1px solid " + C.border }}>
              <div><span style={{ fontWeight: 600, fontSize: 14 }}>{song.name}</span>{song.artist && <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>— {song.artist}</span>}<span style={{ background: C.goldLight, color: C.nav, fontSize: 10, padding: "2px 6px", borderRadius: 4, marginLeft: 8, fontWeight: 600 }}>{sl}</span></div>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "6px 0 8px", whiteSpace: "pre-line", maxHeight: 60, overflow: "hidden", lineHeight: 1.4 }}>{song.lyrics.substring(0, 150)}{song.lyrics.length > 150 ? "..." : ""}</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => useInSection(song)} style={sm(C.success, "#fff")}>Usar</button>
                <button onClick={() => { setEditing(song); setSName(song.name); setSArtist(song.artist || ""); setSCat(song.category); setSLyrics(song.lyrics); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ ...sm("none", C.textMuted), border: "1px solid " + C.border }}>Editar</button>
                {deleting === song.id ? <>
                  <button onClick={() => { setLib(library.filter(s => s.id !== song.id)); setDeleting(null); flash("Removida"); }} style={sm(C.danger, "#fff")}>Confirmar</button>
                  <button onClick={() => setDeleting(null)} style={{ ...sm("none", C.textMuted), border: "1px solid " + C.border }}>Não</button>
                </> : <button onClick={() => setDeleting(song.id)} style={{ ...sm("none", C.danger), border: "1px solid " + C.dangerBg }}>Excluir</button>}
              </div>
            </div>;
          })}
        </div>}

        {tab === "saved" && <div>
          {!savedReps.length ? <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: 40 }}>Nenhum repertório salvo. Monte um na aba Montar e salve.</p> :
          savedReps.map(rep => {
            const n = SECTIONS.filter(s => rep.sections[s.id]?.included && rep.sections[s.id]?.lyrics?.trim()).length;
            const names = SECTIONS.filter(s => rep.sections[s.id]?.included && rep.sections[s.id]?.songName).map(s => rep.sections[s.id].songName).slice(0, 3);
            return <div key={rep.id} style={{ background: C.card, borderRadius: 8, padding: 14, marginBottom: 8, border: "1px solid " + C.border }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{rep.name}</span>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>{rep.date} — {n} seções</p>
              {names.length > 0 && <p style={{ fontSize: 11, color: C.textMuted, margin: "2px 0 0", fontStyle: "italic" }}>{names.join(", ")}{names.length < n ? "..." : ""}</p>}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button onClick={() => { setCur(rep.sections); setTab("build"); flash('"' + rep.name + '" carregado'); }} style={sm(C.gold, C.nav)}>Carregar</button>
                {deleting === rep.id ? <>
                  <button onClick={() => { setReps(savedReps.filter(r => r.id !== rep.id)); setDeleting(null); flash("Excluído"); }} style={sm(C.danger, "#fff")}>Confirmar</button>
                  <button onClick={() => setDeleting(null)} style={{ ...sm("none", C.textMuted), border: "1px solid " + C.border }}>Não</button>
                </> : <button onClick={() => setDeleting(rep.id)} style={{ ...sm("none", C.danger), border: "1px solid " + C.dangerBg }}>Excluir</button>}
              </div>
            </div>;
          })}
        </div>}
      </div>

      <style>{`input:focus,textarea:focus,select:focus{border-color:${C.gold}!important}`}</style>
    </div>
  );
}
