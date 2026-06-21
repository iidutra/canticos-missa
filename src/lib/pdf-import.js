import { SECTIONS } from "../constants.js";

/** Cabeçalhos standalone (PDFs com seção em linha separada do título) */
export const PDF_SECTION_PATTERNS = [
  { id: "final2", patterns: [/^final\s*2\s*$/i, /^segundo\s+canto\s+final\s*$/i] },
  { id: "refrao", patterns: [/^refr[aã]o\s+orante\s*$/i, /^refr[aã]o\s*$/i] },
  { id: "entrada", patterns: [/^canto\s+de\s+abertura\s*$/i, /^entrada\s*$/i] },
  { id: "ato", patterns: [/^ato\s+penitencial\s*$/i, /^ato\s*$/i, /^kyrie\s*$/i] },
  { id: "gloria", patterns: [/^hino\s+de\s+louvor\s*$/i, /^gl[oó]ria\s*$/i] },
  { id: "salmo", patterns: [/^salmo\s+responsorial\s*$/i, /^salmo\s*$/i] },
  { id: "aclamacao", patterns: [/^aclam[aã][çc][aã]o\s+ao\s+evangelho\s*$/i, /^aclam[aã][çc][aã]o\s*$/i] },
  { id: "ofertorio", patterns: [/^ofert[oó]rio\s*$/i, /^apresenta[cç][aã]o\s+das\s+ofer/i] },
  { id: "oracao_oferendas", patterns: [/^ora[cç][aã]o\s+sobre\s+as\s+ofer/i, /^super\s+oblat/i] },
  { id: "santo", patterns: [/^santo\s*$/i] },
  { id: "oe1", patterns: [/^ora[cç][aã]o\s+eucar[ií]stica\s+i\s*$/i, /^oe\s*i\s*$/i] },
  { id: "oe2", patterns: [/^ora[cç][aã]o\s+eucar[ií]stica\s+ii\s*$/i, /^oe\s*ii\s*$/i] },
  { id: "oe3", patterns: [/^ora[cç][aã]o\s+eucar[ií]stica\s+iii\s*$/i, /^oe\s*iii\s*$/i] },
  { id: "oe4", patterns: [/^ora[cç][aã]o\s+eucar[ií]stica\s+iv\s*$/i, /^oe\s*iv\s*$/i] },
  { id: "oe5", patterns: [/^ora[cç][aã]o\s+eucar[ií]stica\s+v\s*$/i, /^oe\s*v\s*$/i] },
  { id: "consagracao", patterns: [/^consagra[cç][aã]o\s*$/i] },
  { id: "cordeiro", patterns: [/^cordeiro\s*$/i, /^agnus\s+dei\s*$/i] },
  { id: "pos", patterns: [/^p[oó]s[\s-]*comunh[aã]o\s*$/i] },
  { id: "comunhao", patterns: [/^ant[ií]fona\s+de\s+comunh[aã]o\s*$/i, /^comunh[aã]o\s*$/i] },
  { id: "oracao_comunhao", patterns: [/^ora[cç][aã]o\s+ap[oó]s\s+comunh[aã]o\s*$/i, /^ora[cç][aã]o\s+p[oó]s[\s-]*comunh[aã]o\s*$/i] },
  { id: "oracao_coleta", patterns: [/^ora[cç][aã]o\s+coleta\s*$/i, /^coleta\s*$/i] },
  { id: "final", patterns: [/^canto\s+final\s*$/i, /^final\s*$/i] },
];

const CHORD_TOKEN =
  /^([A-G]|Dó|Ré|Mi|Fá|Sol|Lá|Si)(?:[#b♭♯]?(?:maj|M|m(?!aj|in)|7|9|11|13|sus|dim|aug|add|%)?)?(?:\/([A-G]|Dó|Ré|Mi|Fá|Sol|Lá|Si)[#b♭♯]?)?$/i;

function isPageNumber(line) {
  return /^\d{1,3}$/.test(line.trim());
}

function isTomLine(line) {
  return /^tom\s*[:：]/i.test(line.trim());
}

function parseTomLine(line) {
  const m = line.trim().match(/^tom\s*[:：]\s*(.+)/i);
  return m ? m[1].trim() : "";
}

function isIntroLine(line) {
  const t = line.trim();
  return /^(?:intr|intro)\s*[:：]/i.test(t) || /^\[(?:intro|refr[aã]o)\]/i.test(t);
}

function isChordLine(line) {
  const t = line.trim();
  if (!t) return false;
  if (/[a-zà-ú]{3,}/.test(t)) return false;
  const tokens = t.split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const chordish = tokens.filter((tok) => CHORD_TOKEN.test(tok));
  return chordish.length > 0 && chordish.length / tokens.length >= 0.55;
}

/**
 * Detecta linhas "Seção: Nome da música" (formato folhetos com cifra).
 * @returns {{ sectionId: string, songTitle: string } | null}
 */
export function parseSectionLine(line) {
  const t = line.trim();
  if (!t || t.length > 160 || isChordLine(t)) return null;

  const withTitle = [
    { id: "refrao", re: /^refr[aã]o\s+orante\s*:\s*(.+)/i },
    { id: "entrada", re: /^entrada\s*:\s*(.+)/i },
    { id: "ato", re: /^ato(?:\s+penitencial)?\s*:\s*(.+)/i },
    { id: "gloria", re: /^hino\s+de\s+louvor\s*:\s*(.+)/i },
    { id: "aclamacao", re: /^aclam[aã][çc][aã]o\s*:\s*(.+)/i },
    { id: "ofertorio", re: /^ofert[oó]rio\s*:\s*(.+)/i },
    { id: "oracao_coleta", re: /^ora[cç][aã]o\s+coleta\s*:\s*(.*)$/i },
    { id: "oracao_oferendas", re: /^ora[cç][aã]o\s+(?:sobre\s+as\s+ofer|super\s+oblat)/i },
    { id: "santo", re: /^santo\s*:\s*(?:santo\s*:\s*)?(.+)/i },
    { id: "oe1", re: /^ora[cç][aã]o\s+eucar[ií]stica\s+i\s*:\s*(.*)$/i },
    { id: "oe2", re: /^ora[cç][aã]o\s+eucar[ií]stica\s+ii\s*:\s*(.*)$/i },
    { id: "oe3", re: /^ora[cç][aã]o\s+eucar[ií]stica\s+iii\s*:\s*(.*)$/i },
    { id: "oe4", re: /^ora[cç][aã]o\s+eucar[ií]stica\s+iv\s*:\s*(.*)$/i },
    { id: "oe5", re: /^ora[cç][aã]o\s+eucar[ií]stica\s+v\s*:\s*(.*)$/i },
    { id: "consagracao", re: /^consagra[cç][aã]o\s*(?::\s*(.+))?$/i },
  ];

  for (const { id, re } of withTitle) {
    const m = t.match(re);
    if (m) {
      const title = (m[1] ?? "").trim();
      const mapped = id === "consagracao" ? "oe2" : id;
      return { sectionId: mapped, songTitle: title || SECTIONS.find((s) => s.id === mapped)?.label || t };
    }
  }

  const withTitleRest = [
    { id: "comunhao", re: /^comunh[aã]o\s*:\s*(.+)/i },
    { id: "pos", re: /^p[oó]s[\s-]*comunh[aã]o\s*:\s*(.+)/i },
    { id: "oracao_comunhao", re: /^ora[cç][aã]o\s+(?:ap[oó]s|p[oó]s[\s-]*)\s*comunh[aã]o\s*:\s*(.*)$/i },
    { id: "final2", re: /^final\s*2\s*:\s*(.+)/i },
    { id: "final", re: /^final\s*:\s*(.+)/i },
  ];
  for (const { id, re } of withTitleRest) {
    const m = t.match(re);
    if (m) return { sectionId: id, songTitle: m[1].trim() };
  }

  if (/^salmo\s+responsorial\b/i.test(t)) {
    const sm = t.match(/\(([^)]+)\)/);
    return { sectionId: "salmo", songTitle: sm ? sm[1].trim() : t };
  }

  if (/^cordeiro(?:\s+de\s+deus)?(?:\s*\([^)]+\))?\s*$/i.test(t)) {
    return { sectionId: "cordeiro", songTitle: t };
  }

  return null;
}

export function matchSectionHeader(line) {
  const parsed = parseSectionLine(line);
  if (parsed) return parsed.sectionId;
  const t = line.trim().replace(/:+\s*$/, "").trim();
  if (!t || t.length > 80 || isChordLine(t)) return null;
  for (const { id, patterns } of PDF_SECTION_PATTERNS) {
    if (patterns.some((p) => p.test(t))) return id === "consagracao" ? "oe2" : id;
  }
  return null;
}

function isLikelySongTitle(line, nextLine) {
  const t = line.trim();
  if (!t || t.length < 3 || t.length > 130) return false;
  if (isPageNumber(t) || isTomLine(t) || isIntroLine(t) || parseSectionLine(t)) return false;
  if (matchSectionHeader(t) || isChordLine(t)) return false;
  if (nextLine && isTomLine(nextLine)) return true;
  if (/\s[-–—]\s/.test(t) && !isChordLine(nextLine)) return true;
  if (nextLine && isChordLine(nextLine)) return false;
  return false;
}

/** Extrai data e título a partir do nome do arquivo */
export function parseFilenameMeta(filename) {
  const base = (filename || "").replace(/\.(pdf|docx?)$/i, "").trim();
  const dateMatch = base.match(/(\d{1,2})[-_/](\d{1,2})[-_/](\d{4})/);
  const missDate = dateMatch
    ? `${dateMatch[1].padStart(2, "0")}/${dateMatch[2].padStart(2, "0")}/${dateMatch[3]}`
    : "";
  const missTitle = base.replace(/\s*\d{1,2}[-_/]\d{1,2}[-_/]\d{4}\s*/, " ").trim();
  return { missTitle, missDate };
}

export function documentKind(filename, mimeType = "") {
  const mime = (mimeType || "").toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/msword") return "doc";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  const n = (filename || "").toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".doc")) return "doc";
  return null;
}

export const ACCEPT_DOCUMENTS =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function parsePdfText(text) {
  const rawLines = text.replace(/^\uFEFF/, "").trimStart().split("\n");
  let missTitle = "";
  let missDate = "";
  const sections = [];
  let currentSection = null;
  let currentSong = null;
  let pendingTitle = null;
  let headerLines = 0;

  const pushSong = () => {
    if (!currentSection || !currentSong) return;
    const lyrics = currentSong.lines.join("\n").trim();
    if (!lyrics) return;
    currentSection.songs.push({
      title: currentSong.title || pendingTitle || "Sem título",
      key: currentSong.key || "",
      lyrics,
    });
    currentSong = null;
    pendingTitle = null;
  };

  const pushSection = () => {
    pushSong();
    if (currentSection?.songs.length) sections.push(currentSection);
    currentSection = null;
    pendingTitle = null;
  };

  const startSong = (title, key = "") => {
    currentSong = { title: title || pendingTitle || "", key, lines: [] };
    pendingTitle = null;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isPageNumber(trimmed)) continue;

    const dateMatch = trimmed.match(/^(\d{1,2}\/\d{1,2}\/\d{4})$/);
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split("/");
      missDate = `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      continue;
    }

    const secId = matchSectionHeader(trimmed);
    const sectionLine = parseSectionLine(trimmed);
    if (sectionLine || secId) {
      pushSection();
      const id = sectionLine?.sectionId ?? secId;
      currentSection = {
        sectionId: id,
        sectionLabel: SECTIONS.find((s) => s.id === id)?.label ?? id,
        songs: [],
      };
      if (sectionLine?.songTitle) pendingTitle = sectionLine.songTitle;
      headerLines = 0;
      continue;
    }

    if (!currentSection) {
      if (headerLines < 3 && !isChordLine(trimmed) && !isTomLine(trimmed)) {
        if (!missTitle) missTitle = trimmed;
        headerLines++;
      }
      continue;
    }

    const nextTrimmed = rawLines[i + 1]?.trim() ?? "";

    if (isTomLine(trimmed)) {
      pushSong();
      startSong(pendingTitle || "", parseTomLine(trimmed));
      continue;
    }

    if (isTomLine(nextTrimmed) && !isChordLine(trimmed) && !matchSectionHeader(trimmed)) {
      pushSong();
      pendingTitle = trimmed.replace(/:+\s*$/, "");
      continue;
    }

    if (isLikelySongTitle(trimmed, nextTrimmed)) {
      pushSong();
      pendingTitle = trimmed.replace(/:+\s*$/, "");
      if (isTomLine(nextTrimmed)) continue;
      if (isChordLine(nextTrimmed)) {
        startSong(pendingTitle);
      }
      continue;
    }

    if (pendingTitle && !currentSong && (isChordLine(trimmed) || trimmed.length > 0)) {
      startSong(pendingTitle);
    }

    if (!currentSong) startSong("");
    currentSong.lines.push(line.replace(/\s+$/, ""));
  }

  pushSection();

  return { missTitle, missDate, sections };
}

export function songsToBlock(songs) {
  if (!songs?.length) return null;
  if (songs.length === 1) {
    return {
      songName: songs[0].title,
      lyrics: songs[0].lyrics,
      key: songs[0].key,
    };
  }
  const lyrics = songs
    .map((s) => {
      const head = `── ${s.title}${s.key ? ` · Tom: ${s.key}` : ""} ──`;
      return `${head}\n${s.lyrics}`.trim();
    })
    .join("\n\n");
  return {
    songName: songs.map((s) => s.title).join(" · "),
    lyrics,
    key: songs[0].key || "",
  };
}

export function parsedToRepertoire(parsed, sectionMap = {}) {
  const base = {};
  SECTIONS.forEach((sec) => {
    base[sec.id] = {
      included: !sec.optional,
      lyrics: "",
      songName: "",
      key: "",
      baseLyrics: "",
      baseKey: "",
      semitones: 0,
    };
  });

  for (const block of parsed.sections) {
    const rawId = block.sectionId === "consagracao" ? "oe2" : block.sectionId;
    const targetId = sectionMap[rawId] ?? rawId;
    if (!base[targetId]) continue;
    const content = songsToBlock(block.songs);
    if (!content?.lyrics?.trim()) continue;
    base[targetId] = {
      included: true,
      songName: content.songName,
      lyrics: content.lyrics,
      key: content.key,
      baseLyrics: content.lyrics,
      baseKey: content.key,
      semitones: 0,
    };
  }

  return base;
}

/** Uma entrada na biblioteca por música detectada, com categoria = seção litúrgica. */
export function parsedToLibraryEntries(parsed, sectionMap = {}) {
  const validIds = new Set(SECTIONS.map((s) => s.id));
  const entries = [];
  let seq = 0;

  for (const block of parsed.sections) {
    const rawId = block.sectionId === "consagracao" ? "oe2" : block.sectionId;
    const category = sectionMap[rawId] ?? rawId;
    if (!validIds.has(category)) continue;

    for (const song of block.songs) {
      const name = song.title?.trim();
      const lyrics = song.lyrics?.trim();
      if (!name || !lyrics) continue;
      entries.push({
        id: `${Date.now()}-${seq++}`,
        name,
        artist: "",
        key: song.key || "",
        category,
        lyrics,
        baseLyrics: lyrics,
        baseKey: song.key || "",
        semitones: 0,
      });
    }
  }

  return entries;
}

function groupItemsIntoLines(items, tolerance = 3) {
  const positioned = items
    .filter((it) => it.str?.trim())
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width ?? it.str.length * 5,
    }));

  positioned.sort((a, b) => b.y - a.y || a.x - b.x);

  const rows = [];
  for (const item of positioned) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= tolerance);
    if (row) {
      row.items.push(item);
      row.y = (row.y + item.y) / 2;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows.map((row) => {
    row.items.sort((a, b) => a.x - b.x);
    let out = "";
    let lastEnd = null;
    for (const p of row.items) {
      if (lastEnd !== null) {
        const gap = p.x - lastEnd;
        if (gap > 14) out += " ".repeat(Math.min(Math.max(Math.round(gap / 5), 2), 24));
        else if (gap > 3) out += " ";
      }
      out += p.str;
      lastEnd = p.x + (p.w || p.str.length * 5);
    }
    return out.replace(/\s+$/, "");
  });
}

let pdfjsModule = null;

async function getPdfjs() {
  if (!pdfjsModule) {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    pdfjsModule = pdfjs;
  }
  return pdfjsModule;
}

export async function extractTextFromDocumentApi(file) {
  const fd = new FormData();
  fd.append("file", file, file.name || "documento");
  const r = await fetch("/api/import/extract-text", { method: "POST", body: fd });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || "Falha ao ler documento");
  }
  const { text } = await r.json();
  return text;
}

export async function extractTextFromPdfClient(file) {
  try {
    const pdfjs = await getPdfjs();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pageTexts = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      pageTexts.push(groupItemsIntoLines(content.items).join("\n"));
    }

    const text = pageTexts.join("\n").trim();
    if (!text) {
      throw new Error("O PDF não contém texto selecionável. Se for um scan/foto, exporte com OCR ou use um PDF gerado digitalmente.");
    }
    return text;
  } catch (err) {
    if (err.message?.includes("selecionável")) throw err;
    const msg = (err?.message || "").toLowerCase();
    if (msg.includes("password") || msg.includes("senha")) {
      throw new Error("O PDF está protegido por senha. Remova a proteção e tente novamente.");
    }
    if (msg.includes("invalid") || msg.includes("corrupt") || msg.includes("format")) {
      throw new Error("Arquivo PDF inválido ou corrompido. Tente exportar o documento novamente.");
    }
    throw new Error(`Não foi possível ler o PDF${err?.message ? `: ${err.message}` : ". Verifique se o arquivo abre normalmente no leitor de PDF."}`);
  }
}

export async function extractTextFromPdf(file) {
  try {
    return await extractTextFromDocumentApi(file);
  } catch (serverErr) {
    try {
      return await extractTextFromPdfClient(file);
    } catch {
      throw serverErr;
    }
  }
}

export async function extractTextFromDocx(file) {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

export async function extractTextFromWordApi(file) {
  return extractTextFromDocumentApi(file);
}

export async function extractTextFromDocument(file) {
  const kind = documentKind(file.name, file.type);
  if (!kind) throw new Error("Formato não suportado. Use PDF, DOC ou DOCX.");

  if (kind === "pdf") return extractTextFromPdf(file);

  if (kind === "docx") {
    try {
      const text = await extractTextFromDocx(file);
      if (text?.trim()) return text;
    } catch {}
    return extractTextFromDocumentApi(file);
  }

  return extractTextFromDocumentApi(file);
}

export async function parseDocumentFile(file) {
  const text = await extractTextFromDocument(file);
  if (!text?.trim()) {
    throw new Error("O documento está vazio ou não foi possível extrair texto. Tente salvar como .docx ou exportar o PDF novamente.");
  }
  const parsed = parsePdfText(text);
  return { ...parsed, rawLength: text.length, pageCount: text.split("\n\n").length };
}

/** @deprecated use parseDocumentFile */
export const parsePdfFile = parseDocumentFile;
