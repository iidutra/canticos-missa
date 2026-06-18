export const SECTIONS = [
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

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

export const C = {
  bg: "#FAF8F5",
  card: "#FFFFFF",
  nav: "#1B2A4A",
  navText: "#E8E4DF",
  gold: "#C9A84C",
  goldLight: "#F5EFD8",
  text: "#2D2D2D",
  textMuted: "#6B6B6B",
  border: "#E2DED8",
  danger: "#B54A4A",
  dangerBg: "#FDF0F0",
  success: "#4A7C59",
  successBg: "#EDF5EF",
  search: "#4A5A8C",
  searchBg: "#EEF0F8",
};

export function emptyRepertoire() {
  const s = {};
  SECTIONS.forEach((sec) => {
    s[sec.id] = {
      included: !sec.optional,
      lyrics: "",
      songName: "",
      key: "",
      baseLyrics: "",
      baseKey: "",
      semitones: 0,
    };
  });
  return s;
}

export function mergeRepertoire(stored) {
  const base = emptyRepertoire();
  if (!stored || typeof stored !== "object") return base;
  for (const sec of SECTIONS) {
    const block = stored[sec.id];
    if (!block) continue;
    const lyrics = block.lyrics ?? "";
    const key = block.key ?? "";
    base[sec.id] = {
      included: block.included ?? base[sec.id].included,
      lyrics,
      songName: block.songName ?? "",
      key,
      baseLyrics: block.baseLyrics ?? lyrics,
      baseKey: block.baseKey ?? key,
      semitones: block.semitones ?? 0,
    };
  }
  return base;
}

export function filledSections(sections) {
  return SECTIONS.filter(
    (s) => sections[s.id]?.included && sections[s.id]?.lyrics?.trim()
  );
}
