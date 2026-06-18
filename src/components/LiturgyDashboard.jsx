import { useEffect, useMemo, useState } from "react";
import { C, FONT, SECTIONS } from "../constants.js";
import {
  fetchLiturgyCalendar,
  fetchLiturgyMass,
  formatBrDate,
  monthGrid,
  readingTitle,
} from "../lib/liturgia.js";
import {
  ORACOES_EUCARISTICAS_IDS,
  ORACOES_PROPRIAS,
  extractOracoesFromMissa,
  fetchOracoesEucaristicas,
} from "../lib/oracoes-liturgicas.js";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function LiturgyDashboard({ onUseSong, onImportPdf, onSelectMiss, onUseOracao, onUseOracoesProprias, savedReps = [] }) {
  const [calendar, setCalendar] = useState({});
  const [meta, setMeta] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(() => formatBrDate(new Date()));
  const [missa, setMissa] = useState(null);
  const [loadingCal, setLoadingCal] = useState(true);
  const [loadingMass, setLoadingMass] = useState(false);
  const [error, setError] = useState(null);
  const [openReading, setOpenReading] = useState("evangelho");
  const [openOracao, setOpenOracao] = useState("coleta");
  const [openOe, setOpenOe] = useState("oe2");
  const [oeTexts, setOeTexts] = useState(null);

  useEffect(() => {
    fetchOracoesEucaristicas()
      .then(setOeTexts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLiturgyCalendar();
        setCalendar(data.calendar ?? {});
        setUpcoming(data.upcoming ?? []);
        setMeta(data.meta ?? null);
      } catch (e) {
        setError(e.message);
      }
      setLoadingCal(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setMissa(null);
      return;
    }
    (async () => {
      setLoadingMass(true);
      setError(null);
      try {
        const data = await fetchLiturgyMass(selectedDate);
        setMissa(data);
        setOpenReading("evangelho");
        onSelectMiss?.({
          date: selectedDate,
          title: data.title,
          slug: data.slug ?? "",
        });
      } catch (e) {
        setMissa(null);
        setError(e.message);
      }
      setLoadingMass(false);
    })();
  }, [selectedDate]);

  const cells = useMemo(
    () => monthGrid(viewYear, viewMonth, calendar),
    [viewYear, viewMonth, calendar]
  );

  const todayKey = useMemo(() => formatBrDate(new Date()), []);

  const savedForSelected = useMemo(
    () => savedReps.filter((r) => r.missDate === selectedDate),
    [savedReps, selectedDate]
  );

  const oracoes = useMemo(() => extractOracoesFromMissa(missa), [missa]);

  const oracaoTabs = useMemo(() => {
    if (!oracoes) return [];
    return [
      { key: "coleta", label: "Coleta", text: oracoes.coleta },
      { key: "oferendas", label: "Oferendas", text: oracoes.oferendas },
      { key: "comunhao", label: "Pós-comunhão", text: oracoes.comunhao },
      { key: "antifona_entrada", label: "Ant. entrada", text: oracoes.antifonaEntrada },
      { key: "antifona_comunhao", label: "Ant. comunhão", text: oracoes.antifonaComunhao },
    ].filter((t) => t.text?.trim());
  }, [oracoes]);

  const shiftMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  };

  const pickDate = (date) => {
    setSelectedDate(date);
    const [d, m, y] = date.split("/").map(Number);
    setViewMonth(m - 1);
    setViewYear(y);
  };

  const sectionLabel = (id) => SECTIONS.find((s) => s.id === id)?.label ?? id;

  if (loadingCal) {
    return (
      <p style={{ textAlign: "center", color: C.textMuted, padding: 40, fontFamily: FONT }}>
        Carregando calendário litúrgico...
      </p>
    );
  }

  return (
    <div className="liturgy-layout" style={{ fontFamily: FONT }}>
      <div className="liturgy-calendar-col">
      {meta?.total > 0 && (
        <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 12px", textAlign: "center" }}>
          Acervo: {meta.total} datas
          {meta.lastSyncAt ? ` · sync ${new Date(meta.lastSyncAt).toLocaleDateString("pt-BR")}` : ""}
        </p>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button type="button" className="btn btn-sm" onClick={() => shiftMonth(-1)} style={navBtn} aria-label="Mês anterior">‹</button>
          <span style={{ fontWeight: 700, color: C.nav, fontSize: 15 }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button type="button" className="btn btn-sm" onClick={() => shiftMonth(1)} style={navBtn} aria-label="Próximo mês">›</button>
        </div>

        <div className="cal-grid" style={{ marginBottom: 4 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((cell, i) =>
            cell ? (
              <button
                key={cell.date}
                type="button"
                onClick={() => pickDate(cell.date)}
                title={cell.entry?.title ?? "Liturgia CNBB (sem cantos MPM)"}
                className={[
                  "cal-day",
                  selectedDate === cell.date ? "cal-day--selected" : "",
                  cell.date === todayKey && selectedDate !== cell.date ? "cal-day--today" : "",
                  cell.entry?.destaque && selectedDate !== cell.date ? "cal-day--destaque" : "",
                ].filter(Boolean).join(" ")}
              >
                {cell.day}
                {cell.entry ? (
                  <span className="cal-dot cal-dot--mpm" />
                ) : (
                  <span className="cal-dot cal-dot--cnbb" />
                )}
              </button>
            ) : (
              <div key={`empty-${i}`} />
            )
          )}
        </div>

        <p style={{ fontSize: 11, color: C.textMuted, margin: "10px 0 0", textAlign: "center" }}>
          <span style={{ color: C.search }}>●</span> cantos no{" "}
          <a href="https://musicasparamissa.com.br/" target="_blank" rel="noopener noreferrer" style={{ color: C.search }}>
            Músicas para Missa
          </a>
          {" · "}
          <span style={{ opacity: 0.6 }}>○</span> só liturgia CNBB
        </p>
      </div>

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: C.nav, margin: "0 0 8px" }}>Próximas missas</h3>
          <div className="chip-scroll">
            {upcoming.map((u) => (
              <button
                key={u.date}
                type="button"
                className="chip"
                onClick={() => pickDate(u.date)}
                style={{
                  background: selectedDate === u.date ? C.nav : C.card,
                  color: selectedDate === u.date ? C.navText : C.text,
                  border: `1px solid ${selectedDate === u.date ? C.nav : C.border}`,
                  minWidth: 140,
                }}
              >
                <span style={{ fontSize: 10, opacity: 0.8 }}>{u.date}</span>
                <span style={{ fontSize: 11, fontWeight: 600, display: "block", marginTop: 2, lineHeight: 1.3 }}>
                  {u.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {savedForSelected.length > 0 && (
        <div className="card" style={{ background: C.successBg, borderColor: `${C.success}44` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.success, marginBottom: 6 }}>
            Repertório já salvo para esta missa
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {savedForSelected.map((r) => (
              <li key={r.id} style={{ fontSize: 12, color: C.text, padding: "2px 0" }}>
                {r.name}
                {r.date ? ` (salvo em ${r.date})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>

      <div className="liturgy-detail-col">
      {loadingMass && (
        <p style={{ textAlign: "center", color: C.textMuted, padding: 20 }}>Carregando liturgia...</p>
      )}

      {error && !loadingMass && (
        <p style={{ textAlign: "center", color: C.danger, padding: 16, fontSize: 13 }}>{error}</p>
      )}

      {missa && !loadingMass && (
        <>
          {missa.cnbbOnly && (
            <div style={{ background: "#FFF8E7", border: "1px solid #E8D48B", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12, color: "#8B6914" }}>
              Sem sugestões de cantos no Músicas para Missa para {selectedDate}. Exibindo liturgia da Palavra via CNBB.
            </div>
          )}

          <div className="card">
            <div className="missa-header">
              {missa.image && (
                <div className="missa-header__thumb">
                  <img src={missa.image} alt="" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, color: C.nav, lineHeight: 1.3 }}>{missa.title}</h2>
                <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>
                  {missa.date || selectedDate}
                  {missa.cnbb?.cor ? ` · Cor litúrgica: ${missa.cnbb.cor}` : ""}
                </p>
              </div>
            </div>
            {missa.reflection && (
              <div style={{ marginTop: 12, padding: 10, background: C.goldLight, borderRadius: 6, borderLeft: `3px solid ${C.gold}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.nav, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Reflexão do evangelho
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.text, fontStyle: "italic" }}>
                  {missa.reflection}
                </p>
              </div>
            )}
            {missa.sourceUrl && (
              <a
                href={missa.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: C.search }}
              >
                Ver no Músicas para Missa ↗
              </a>
            )}
            {onImportPdf && (
              <button
                type="button"
                className="btn btn--block"
                onClick={() => onImportPdf({ title: missa.title, date: missa.date || selectedDate })}
                style={{
                  marginTop: 10,
                  background: C.nav,
                  color: C.navText,
                  fontFamily: FONT,
                }}
              >
                Importar documento de cifras desta missa
              </button>
            )}
          </div>

          {missa.readings?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.nav, margin: "0 0 10px" }}>Liturgia da Palavra</h3>
              <div className="reading-tabs">
                {missa.readings.map((r) => (
                  <button
                    key={r.kind + r.reference}
                    type="button"
                    className="chip"
                    onClick={() => setOpenReading(r.kind)}
                    style={{
                      padding: "5px 10px",
                      minHeight: 36,
                      background: openReading === r.kind ? C.search : C.searchBg,
                      color: openReading === r.kind ? "#fff" : C.search,
                      border: "none",
                      fontFamily: FONT,
                    }}
                  >
                    {readingTitle(r)}
                  </button>
                ))}
              </div>
              {missa.readings
                .filter((r) => r.kind === openReading)
                .map((r) => (
                  <div key={r.kind + r.reference}>
                    {r.reference && (
                      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: C.search }}>
                        {r.reference}
                        {r.theme ? ` — ${r.theme}` : ""}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: C.text, whiteSpace: "pre-wrap" }}>
                      {r.text}
                    </p>
                  </div>
                ))}
            </div>
          )}

          {oracaoTabs.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: C.nav, margin: 0 }}>Orações da Missa</h3>
                {onUseOracoesProprias && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onUseOracoesProprias(oracoes)}
                    style={{
                      background: C.goldLight,
                      color: C.nav,
                      border: `1px solid ${C.gold}`,
                      fontFamily: FONT,
                    }}
                  >
                    Carregar todas na Montagem
                  </button>
                )}
              </div>
              <div className="reading-tabs">
                {oracaoTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className="chip"
                    onClick={() => setOpenOracao(t.key)}
                    style={{
                      padding: "5px 10px",
                      minHeight: 36,
                      background: openOracao === t.key ? C.gold : C.goldLight,
                      color: openOracao === t.key ? C.nav : C.text,
                      border: "none",
                      fontFamily: FONT,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {oracaoTabs
                .filter((t) => t.key === openOracao)
                .map((t) => (
                  <div key={t.key}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.55, color: C.text, whiteSpace: "pre-wrap" }}>
                      {t.text}
                    </p>
                    {onUseOracao && t.key.startsWith("antifona_") ? null : onUseOracao && ORACOES_PROPRIAS.find((o) => o.cnbbKey === t.key) ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() =>
                          onUseOracao(
                            ORACOES_PROPRIAS.find((o) => o.cnbbKey === t.key).id,
                            { text: t.text, songName: t.label }
                          )
                        }
                        style={{
                          background: C.successBg,
                          color: C.success,
                          border: `1px solid ${C.success}44`,
                          fontFamily: FONT,
                        }}
                      >
                        Usar na Montagem
                      </button>
                    ) : null}
                  </div>
                ))}
            </div>
          )}

          {oeTexts && (
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.nav, margin: "0 0 10px" }}>
                Orações Eucarísticas
              </h3>
              <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 10px" }}>
                Textos do Missal Romano para acompanhar na apresentação. Inclua o Prefácio do dia conforme o folheto da paróquia.
              </p>
              <div className="reading-tabs" style={{ marginBottom: 10 }}>
                {ORACOES_EUCARISTICAS_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="chip"
                    onClick={() => setOpenOe(id)}
                    style={{
                      padding: "5px 10px",
                      minHeight: 36,
                      background: openOe === id ? C.nav : C.searchBg,
                      color: openOe === id ? C.navText : C.search,
                      border: "none",
                      fontFamily: FONT,
                    }}
                  >
                    {id.toUpperCase().replace("OE", "OE ")}
                  </button>
                ))}
              </div>
              {oeTexts[openOe] && (
                <>
                  {oeTexts[openOe].subtitle && (
                    <p style={{ margin: "0 0 8px", fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>
                      {oeTexts[openOe].subtitle}
                    </p>
                  )}
                  <p className="liturgy-oe-preview">{oeTexts[openOe].text}</p>
                  {onUseOracao && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() =>
                        onUseOracao(openOe, {
                          text: oeTexts[openOe].text,
                          songName: oeTexts[openOe].label,
                        })
                      }
                      style={{
                        marginTop: 10,
                        background: C.nav,
                        color: C.navText,
                        fontFamily: FONT,
                      }}
                    >
                      Usar {oeTexts[openOe].label} na Montagem
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {missa.songs?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.nav, margin: "0 0 4px" }}>
                Sugestões de cantos
              </h3>
              <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 12px" }}>
                Fonte: Músicas para Missa — clique em Usar para buscar no Cifra Club na aba Montar.
              </p>
              {missa.songs.map((group) => (
                <div key={group.sectionId} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 6, textTransform: "uppercase" }}>
                    {sectionLabel(group.sectionId)}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {group.items.slice(0, 3).map((song) => (
                      <li key={song.url} className="song-row">
                        <span style={{ fontSize: 12, lineHeight: 1.4, flex: 1 }}>{song.name}</span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onUseSong(group.sectionId, song.name, song.url)}
                          style={{
                            background: C.successBg,
                            color: C.success,
                            border: `1px solid ${C.success}44`,
                            flexShrink: 0,
                            fontFamily: FONT,
                          }}
                        >
                          Usar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

const navBtn = {
  background: C.goldLight,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  width: 44,
  height: 44,
  cursor: "pointer",
  fontWeight: 700,
  color: C.nav,
  fontFamily: FONT,
  flexShrink: 0,
};
