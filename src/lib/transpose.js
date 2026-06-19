/** Notas cromáticas */
const CHROMA = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const CHROMA_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_QUALITIES = ["", "m", "m", "", "", "m", "dim"];
const MAJOR_DEGREES = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

const ROOT_ALIASES = {
  C: 0, "B#": 0,
  "C#": 1, Db: 1,
  D: 2,
  "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, "E#": 5,
  "F#": 6, Gb: 6,
  G: 7,
  "G#": 8, Ab: 8,
  A: 9,
  "A#": 10, Bb: 10,
  B: 11, Cb: 11,
  "Dó": 0, DO: 0, Do: 0, "DÓ": 0,
  "Dó#": 1, "DO#": 1, "Réb": 1, REB: 1, "Ré♭": 1,
  "Ré": 2, RE: 2, Re: 2, "RÉ": 2,
  "Ré#": 3, "RE#": 3, Mib: 3, MIB: 3, "Mi♭": 3,
  Mi: 4, MI: 4, mi: 4, "MÍ": 4,
  "Fá": 5, FA: 5, Fa: 5, "FÁ": 5,
  "Fá#": 6, "FA#": 6, Solb: 6, SOLb: 6,
  Sol: 7, SOL: 7, sol: 7,
  "Sol#": 8, "SOL#": 8, "Láb": 8, LAb: 8, LAB: 8,
  "Lá": 9, LA: 9, La: 9, "LÁ": 9,
  "Lá#": 10, "LA#": 10, Sib: 10, SIB: 10,
  Si: 11, SI: 11, si: 11, "Sí": 11, "SÍ": 11,
};

export const KEY_OPTIONS = [
  { value: 0, label: "Dó (C)" },
  { value: 1, label: "Ré♭ (Db)" },
  { value: 2, label: "Ré (D)" },
  { value: 3, label: "Mi♭ (Eb)" },
  { value: 4, label: "Mi (E)" },
  { value: 5, label: "Fá (F)" },
  { value: 6, label: "Sol♭ (Gb)" },
  { value: 7, label: "Sol (G)" },
  { value: 8, label: "Lá♭ (Ab)" },
  { value: 9, label: "Lá (A)" },
  { value: 10, label: "Si♭ (Bb)" },
  { value: 11, label: "Si (B)" },
];

/** Sufixo de cifra: ordem importa (min antes de m, maj7 antes de maj, m7 antes de m) */
const CHORD_SUFFIX =
  "(?:maj7|m7|min7|min|maj|dim7|dim|aug|sus4|sus2|add9|add11|M7|7|m(?!aj|in)|sus|6|9|11|13|°|º|\\+)";

/** Raiz + alteração + sufixo + baixo; exige delimitador após a cifra */
const CHORD_RE =
  new RegExp(
    "(?<![A-Za-zÀ-ú0-9])" +
      "([A-G]|Dó|DÓ|Ré|RÉ|Mi|MÍ|Fá|FÁ|Sol|SOL|Lá|LÁ|Si|SI|Do|DO|Re|RE|Fa|FA|La|LA)" +
      "([#b♭♯]?)" +
      CHORD_SUFFIX +
      "*" +
      "(?:\\/([A-G]|Dó|Ré|Mi|Fá|Sol|Lá|Si|Do|Re|Fa|La|SI)([#b♭♯]?))?" +
      "(?=[\\s,;:\\]|\\).]|\\/|$)",
    "g"
  );

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

function preferFlats(semi) {
  return [1, 3, 6, 8, 10].includes(mod12(semi));
}

function noteAt(semi, useFlats) {
  return (useFlats ? CHROMA_FLAT : CHROMA)[mod12(semi)];
}

function rootToSemi(root, acc) {
  const r = root.length <= 2 ? root : root.charAt(0).toUpperCase() + root.slice(1).toLowerCase();
  const a = (acc || "").replace("♭", "b").replace("♯", "#");
  const k1 = r + a;
  if (ROOT_ALIASES[k1] !== undefined) return ROOT_ALIASES[k1];
  if (ROOT_ALIASES[r] !== undefined && !a) return ROOT_ALIASES[r];
  const k2 = root.toUpperCase() + a;
  if (ROOT_ALIASES[k2] !== undefined) return ROOT_ALIASES[k2];
  return null;
}

export function parseKey(keyStr) {
  if (!keyStr || typeof keyStr !== "string") return null;
  const t = keyStr.trim().replace(/\s*(maior|menor|major|minor)\s*$/i, "");
  const inside = t.match(/\(([A-G][#b]?)\)/);
  if (inside) return rootToSemi(inside[1], "");
  const before = t.split("(")[0].trim();
  return rootToSemi(before, "") ?? rootToSemi(before.slice(0, -1), before.slice(-1));
}

export function semitoneToKey(semi, useFlats) {
  const s = mod12(semi);
  const flats = useFlats ?? preferFlats(s);
  const en = noteAt(s, flats);
  const pt = {
    C: "Dó", Db: "Ré♭", D: "Ré", Eb: "Mi♭", E: "Mi", F: "Fá",
    Gb: "Sol♭", G: "Sol", Ab: "Lá♭", A: "Lá", Bb: "Si♭", B: "Si",
    "C#": "Dó#", "D#": "Ré#", "F#": "Fá#", "G#": "Sol#", "A#": "Lá#",
  };
  return `${pt[en] || en} (${en})`;
}

export function transposeKeyName(keyStr, semitones) {
  const base = parseKey(keyStr);
  if (base === null) return keyStr;
  return semitoneToKey(base + semitones);
}

function transposeRootStr(root, acc, semitones, refSemi) {
  const semi = rootToSemi(root, acc);
  if (semi === null) return root + (acc || "");
  const next = mod12(semi + semitones);
  return noteAt(next, preferFlats(refSemi ?? next));
}

export function hasChords(text) {
  if (!text) return false;
  CHORD_RE.lastIndex = 0;
  return CHORD_RE.test(text);
}

export function transposeLyrics(lyrics, semitones, refSemi = 0) {
  if (!lyrics || semitones === 0) return lyrics;
  CHORD_RE.lastIndex = 0;
  return lyrics.replace(CHORD_RE, (match, root, acc, bassRoot, bassAcc) => {
    const afterRoot = match.slice(root.length + (acc?.length || 0));
    const slashIdx = afterRoot.indexOf("/");
    const qual = slashIdx >= 0 ? afterRoot.slice(0, slashIdx) : afterRoot;
    let out = transposeRootStr(root, acc, semitones, refSemi) + qual;
    if (bassRoot) {
      out += "/" + transposeRootStr(bassRoot, bassAcc, semitones, refSemi);
    }
    return out;
  });
}

export function isChordOnlyLine(line) {
  if (!line.trim()) return false;
  const stripped = line.replace(CHORD_RE, "").trim();
  return stripped === "";
}

/** Quebra uma linha em trechos de texto e acordes (para renderização com cor). */
export function splitLineByChords(line) {
  const parts = [];
  CHORD_RE.lastIndex = 0;
  let last = 0;
  let m;
  while ((m = CHORD_RE.exec(line)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: line.slice(last, m.index) });
    }
    parts.push({ type: "chord", value: m[0] });
    last = m.index + m[0].length;
  }
  if (parts.length === 0) {
    return [{ type: "text", value: line }];
  }
  if (last < line.length) {
    parts.push({ type: "text", value: line.slice(last) });
  }
  return parts;
}

export function isSectionMarkerLine(line) {
  const t = line.trim();
  return /^\[[^\]]+\]$/.test(t) || /^\([^)]+\)$/.test(t);
}

export function stripChordsFromLyrics(lyrics) {
  if (!lyrics) return lyrics;
  return lyrics
    .split("\n")
    .map((line) => {
      CHORD_RE.lastIndex = 0;
      return line.replace(CHORD_RE, "").trimEnd();
    })
    .filter((line) => line.trim() !== "")
    .join("\n");
}

/** Prefixos vocais / litúrgicos removidos na exportação (como no modelo) */
const EXPORT_VOCAL_PREFIX_RE =
  /^(?:refr[aã]o(?:\s+orante)?|ref\.?|solo|todos|coro|assembleia|pe\.?|padre|t\.?|p\.?|a\.?|c\.?|intro|final|verso|estrofe|cantor|igreja|comunidade)\s*:\s*/iu;

const EXPORT_SKIP_LINE_RE =
  /^(?:\[[^\]]+\]|──\s*.+\s*──|[─\-–—=]{2,}\s*.+\s*[─\-–—=]{2,})$/u;

export function isExportSkipLine(line) {
  return EXPORT_SKIP_LINE_RE.test(line.trim());
}

export function stripExportVocalPrefix(line) {
  const trimmed = line.trim();
  if (!trimmed) return "";
  if (isExportSkipLine(trimmed)) return null;
  const stripped = trimmed.replace(EXPORT_VOCAL_PREFIX_RE, "");
  return stripped.trim() === "" ? null : stripped;
}

function stripChordsForExport(lyrics) {
  if (!lyrics) return "";
  return lyrics
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return "";
      CHORD_RE.lastIndex = 0;
      const stripped = line.replace(CHORD_RE, "").trimEnd();
      return stripped.trim() === "" ? null : stripped;
    })
    .filter((line) => line !== null)
    .join("\n");
}

function cleanLineForExport(line) {
  if (line.trim() === "") return "";
  const cleaned = stripExportVocalPrefix(line);
  return cleaned === null ? null : cleaned;
}

export function lyricsForExport(lyrics) {
  return hasChords(lyrics) ? stripChordsFromLyrics(lyrics) : lyrics;
}

/** Letras prontas para documento: sem cifras, sem prefixos vocais, quebras preservadas */
export function prepareLyricsForExport(lyrics) {
  if (!lyrics) return "";
  const raw = hasChords(lyrics) ? stripChordsForExport(lyrics) : lyrics;
  const lines = [];
  for (const line of raw.split("\n")) {
    const cleaned = cleanLineForExport(line);
    if (cleaned === null) continue;
    lines.push(cleaned);
  }
  return lines.join("\n").trim();
}

export function getHarmonicField(keyStr) {
  const tonic = parseKey(keyStr);
  if (tonic === null) return [];
  const flats = preferFlats(tonic);
  return MAJOR_INTERVALS.map((interval, i) => {
    const root = noteAt(tonic + interval, flats);
    return { degree: MAJOR_DEGREES[i], chord: root + MAJOR_QUALITIES[i] };
  });
}

export function ensureTransposeBase(block) {
  const lyrics = block.lyrics ?? "";
  const key = block.key ?? "";
  return {
    baseLyrics: block.baseLyrics ?? lyrics,
    baseKey: block.baseKey ?? key,
    semitones: block.semitones ?? 0,
  };
}

export function applyTransposeFromBase(block, totalSemitones) {
  const { baseLyrics, baseKey } = ensureTransposeBase(block);
  if (!baseLyrics && !baseKey) return block;

  const ref = parseKey(baseKey) ?? 0;
  const lyrics = hasChords(baseLyrics)
    ? transposeLyrics(baseLyrics, totalSemitones, ref)
    : baseLyrics;
  const key = baseKey ? transposeKeyName(baseKey, totalSemitones) : block.key ?? "";

  return { ...block, baseLyrics, baseKey, semitones: totalSemitones, lyrics, key };
}

export function transposeBlock(block, deltaSemitones) {
  const { semitones } = ensureTransposeBase(block);
  return applyTransposeFromBase(block, semitones + deltaSemitones);
}

export function resetTranspose(block) {
  const { baseLyrics, baseKey } = ensureTransposeBase(block);
  return { ...block, lyrics: baseLyrics, key: baseKey, semitones: 0 };
}

export function setBlockToKey(block, targetSemi) {
  const { baseKey } = ensureTransposeBase(block);
  const baseSemi = parseKey(baseKey);
  const delta = baseSemi !== null ? targetSemi - baseSemi : targetSemi;
  return applyTransposeFromBase(block, delta);
}

export function syncManualEdit(block, fields) {
  const next = { ...block, ...fields };
  if ((block.semitones ?? 0) === 0) {
    if (fields.lyrics !== undefined) {
      next.baseLyrics = fields.lyrics;
      if (fields.key === undefined) next.baseKey = block.baseKey ?? block.key ?? "";
    }
    if (fields.key !== undefined) {
      next.baseKey = fields.key;
      if (fields.lyrics === undefined) next.baseLyrics = block.baseLyrics ?? block.lyrics ?? "";
    }
  }
  return next;
}

export function initBlockWithContent(fields) {
  const lyrics = fields.lyrics ?? "";
  const key = fields.key ?? "";
  return {
    included: fields.included ?? true,
    songName: fields.songName ?? "",
    lyrics,
    key,
    baseLyrics: lyrics,
    baseKey: key,
    semitones: 0,
  };
}
