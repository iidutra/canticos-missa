const MPM_BASE = "https://musicasparamissa.com.br";
const LITURGIA_API = "https://liturgia.cloudhub.ia.br/v1/liturgia";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const SONG_SECTION_MAP = {
  "Canto de Abertura": "entrada",
  "Ato Penitencial": "ato",
  "Hino de Louvor": "gloria",
  "Refrão Orante": "refrao",
  "Salmo Responsorial": "salmo",
  "Aclamação ao Evangelho": "aclamacao",
  "Apresentação das Oferendas": "ofertorio",
  Santo: "santo",
  Cordeiro: "cordeiro",
  Comunhão: "comunhao",
  "Pós Comunhão": "pos",
  Final: "final",
};

function decodeHtml(text) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(text) {
  return decodeHtml(text).replace(/\s+/g, " ").trim();
}

function parseDateParts(dateStr) {
  const [d, m, y] = dateStr.split("/").map(Number);
  return { dia: d, mes: m, ano: y };
}

export async function fetchCalendar() {
  const res = await fetch(`${MPM_BASE}/datas.json`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Calendário indisponível");
  return res.json();
}

export async function fetchMassHtml(slug) {
  const url = `${MPM_BASE}/sugestoes-para/${slug.replace(/^\/+|\/+$/g, "")}/`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "pt-BR" },
  });
  if (!res.ok) throw new Error("Missão não encontrada");
  return { html: await res.text(), url };
}

export function parseMassPage(html, sourceUrl) {
  const title = stripTags(html.match(/<h2 class="page-title">([\s\S]*?)<\/h2>/i)?.[1] ?? "");
  const date = stripTags(html.match(/<h2 class="page-title">[\s\S]*?<\/h2>\s*<h3>([^<]+)<\/h3>/i)?.[1] ?? "");
  const image = html.match(/images\/diasLiturgicos\/300\/([^"]+)"/i)?.[1]
    ? `https://s3.sa-east-1.amazonaws.com/static.musicasparamissa.com.br/images/diasLiturgicos/300/${html.match(/images\/diasLiturgicos\/300\/([^"]+)"/i)[1]}`
    : null;

  const readings = [];
  const songs = [];
  let reflection = "";

  const blocks = [...html.matchAll(
    /accordion-toggle[^>]*>([\s\S]*?)<\/a>\s*<\/div>\s*<div id="[^"]+" class="accordion-body[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi
  )];

  for (const [, headingRaw, bodyRaw] of blocks) {
    const heading = stripTags(headingRaw);

    let kind = null;
    if (/^Primeira Leitura/i.test(heading)) kind = "primeira";
    else if (/^Segunda Leitura/i.test(heading)) kind = "segunda";
    else if (/^Salmo Responsorial/i.test(heading)) kind = "salmo";
    else if (/^Evangelho\s*\(/i.test(heading)) kind = "evangelho";

    if (kind) {
      const refMatch = heading.match(/\(([^)]+)\)/);
      const themeMatch = heading.match(/\)\s*[-–—]\s*(.+?)(?:\s*-\s*Sugest|$)/)
        ?? heading.match(/Salmo Responsorial\s+\S+\s*[-–—]\s*(.+?)(?:\s*-\s*Sugest|$)/);
      let reference = refMatch?.[1]?.trim() ?? "";
      if (kind === "salmo") {
        const sm = heading.match(/Salmo Responsorial\s+(\S+)/i);
        if (sm) reference = `Sl ${sm[1]}`;
      }
      const theme = themeMatch?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
      const text = decodeHtml(bodyRaw.match(/accordion-inner[\s\S]*?(<[\s\S]*)/i)?.[1] ?? bodyRaw);

      if (kind === "evangelho" && theme) reflection = theme;

      if (reference || text.length > 40) {
        readings.push({ kind, label: heading.split("(")[0].trim(), reference, theme, text });
      }
      continue;
    }

    if (!heading.includes("Sugestões de Músicas") && !heading.includes("Sugestões de Melodia")) continue;

    const sectionLabel = heading
      .replace(/\s*-\s*Sugestões de Músicas.*/i, "")
      .replace(/\s*-\s*Sugestões de Melodia.*/i, "")
      .trim();
    const sectionId = SONG_SECTION_MAP[sectionLabel];
    if (!sectionId) continue;

    const items = [...bodyRaw.matchAll(/href="(\/musica\/[^"]+)"[^>]*>\s*([\s\S]*?)<\/a/gi)].map((m) => ({
      name: stripTags(m[2]),
      url: `${MPM_BASE}${m[1]}`,
    }));

    if (items.length) songs.push({ sectionId, sectionLabel, items });
  }

  if (!reflection) {
    const ev = readings.find((r) => r.kind === "evangelho");
    reflection = ev?.theme ?? "";
  }

  return {
    title,
    date,
    image,
    sourceUrl,
    reflection,
    readings,
    songs,
  };
}

export async function fetchCnbbLiturgy(dateStr) {
  const { dia, mes, ano } = parseDateParts(dateStr);
  const res = await fetch(`${LITURGIA_API}?dia=${dia}&mes=${mes}&ano=${ano}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const day = Array.isArray(data) ? data[0] : data;
  const cel = day?.celebracoes?.find((c) => c.principal) ?? day?.celebracoes?.[0];
  if (!cel) return null;
  return {
    nome: day.nome,
    liturgia: cel.liturgia,
    cor: cel.cor,
    antifonas: cel.antifonas,
    oracoes: cel.oracoes,
    leituras: cel.leituras,
  };
}

export function cnbbLeiturasToReadings(leituras) {
  const out = [];
  for (const l of leituras || []) {
    const opt = l.opcoes?.[0];
    if (!opt) continue;

    let kind = "primeira";
    if (l.tipo === "salmo") kind = "salmo";
    else if (l.tipo === "evangelho") kind = "evangelho";
    else if (/segunda/i.test(l.rotulo || "")) kind = "segunda";

    const reference = opt.referencia || "";
    const theme = l.tipo === "salmo" ? (opt.refrao || "") : "";
    const text =
      l.tipo === "salmo"
        ? `${opt.refrao ? `${opt.refrao}\n\n` : ""}${opt.texto || ""}`.trim()
        : (opt.texto || "").trim();

    if (reference || text.length > 20) {
      out.push({ kind, label: l.rotulo || reference, reference, theme, text });
    }
  }
  return out;
}

export async function fetchMassCnbbOnly(dateStr) {
  const cnbb = await fetchCnbbLiturgy(dateStr);
  if (!cnbb) return null;

  const readings = cnbbLeiturasToReadings(cnbb.leituras);
  const ev = readings.find((r) => r.kind === "evangelho");

  return {
    date: dateStr,
    title: cnbb.liturgia || cnbb.nome || dateStr,
    image: null,
    sourceUrl: null,
    slug: null,
    destaque: false,
    calendarTitle: cnbb.liturgia,
    reflection: ev?.theme || "",
    readings,
    songs: [],
    cnbb,
    cnbbOnly: true,
    source: "cnbb",
  };
}

export async function fetchMassByDate(dateStr, calendar) {
  const cal = calendar ?? (await fetchCalendar());
  const entry = cal[dateStr];
  if (!entry?.url) return fetchMassCnbbOnly(dateStr);

  const slug = entry.url.replace(/^\/sugestoes-para\//, "").replace(/\/$/, "");
  const { html, url } = await fetchMassHtml(slug);
  const parsed = parseMassPage(html, url);

  let cnbb = null;
  try {
    cnbb = await fetchCnbbLiturgy(dateStr);
  } catch {}

  return {
    date: dateStr,
    slug,
    destaque: !!entry.destaque,
    calendarTitle: entry.title,
    cnbbOnly: false,
    ...parsed,
    cnbb,
    source: "musicasparamissa.com.br",
  };
}

export async function fetchUpcoming(calendar, limit = 8) {
  const cal = calendar ?? (await fetchCalendar());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Object.entries(cal)
    .map(([date, info]) => ({ date, ...info }))
    .filter(({ date }) => {
      const [d, m, y] = date.split("/").map(Number);
      return new Date(y, m - 1, d) >= today;
    })
    .sort((a, b) => {
      const pa = a.date.split("/").map(Number);
      const pb = b.date.split("/").map(Number);
      return new Date(pa[2], pa[1] - 1, pa[0]) - new Date(pb[2], pb[1] - 1, pb[0]);
    })
    .slice(0, limit);
}

export function defaultSelectedDate(calendar) {
  const cal = calendar ?? {};
  const fmt = (dt) => {
    const d = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}/${dt.getFullYear()}`;
  };
  const todayStr = fmt(new Date());
  if (cal[todayStr]) return todayStr;

  const upcoming = Object.keys(cal)
    .map((date) => {
      const [d, m, y] = date.split("/").map(Number);
      return { date, t: new Date(y, m - 1, d).getTime() };
    })
    .filter(({ t }) => t >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => a.t - b.t);
  if (upcoming.length) return upcoming[0].date;

  const destaque = Object.entries(cal).find(([, v]) => v.destaque);
  return destaque?.[0] ?? Object.keys(cal)[0] ?? todayStr;
}
