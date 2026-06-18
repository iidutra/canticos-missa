export async function fetchLiturgyCalendar() {
  try {
    const r = await fetch("/api/liturgia/calendar");
    if (r.ok) return r.json();
  } catch {}
  const r = await fetch("/data/mpm-calendar.json");
  if (!r.ok) throw new Error("Calendário indisponível");
  const raw = await r.json();
  const calendar = raw.entries ?? raw;
  return { calendar, upcoming: [], meta: { total: Object.keys(calendar).length, source: "static" } };
}

export async function fetchLiturgyMass(date) {
  const r = await fetch(`/api/liturgia/missa?date=${encodeURIComponent(date)}`);
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || "Missão não encontrada");
  }
  return r.json();
}

export function parseBrDate(dateStr) {
  const [d, m, y] = dateStr.split("/").map(Number);
  return new Date(y, m - 1, d);
}

export function formatBrDate(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}

export function monthGrid(year, month, calendar) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const key = formatBrDate(dt);
    cells.push({ day: d, date: key, entry: calendar[key] ?? null });
  }
  return cells;
}

const READING_LABELS = {
  primeira: "Primeira Leitura",
  salmo: "Salmo",
  segunda: "Segunda Leitura",
  evangelho: "Evangelho",
};

export function readingTitle(r) {
  return READING_LABELS[r.kind] ?? r.label;
}

/** Extrai nome buscável a partir do título do MPM */
export function cleanSongName(raw) {
  return raw
    .replace(/\s*\([^)]*\)/g, "")
    .split(" - ")[0]
    .trim();
}
