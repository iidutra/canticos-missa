/** Seções de oração própria (CNBB) e Orações Eucarísticas (Missal Romano). */

export const ORACOES_PROPRIAS = [
  { id: "oracao_coleta", cnbbKey: "coleta", label: "Oração Coleta" },
  { id: "oracao_oferendas", cnbbKey: "oferendas", label: "Oração sobre as Oferendas" },
  { id: "oracao_comunhao", cnbbKey: "comunhao", label: "Oração após Comunhão" },
];

export const ORACOES_EUCARISTICAS_IDS = ["oe1", "oe2", "oe3", "oe4", "oe5"];

let oeCache = null;

export async function fetchOracoesEucaristicas() {
  if (oeCache) return oeCache;
  const r = await fetch("/data/oracoes-eucaristicas.json");
  if (!r.ok) throw new Error("Textos das Orações Eucarísticas indisponíveis");
  oeCache = await r.json();
  return oeCache;
}

export async function getOracaoEucaristica(id) {
  const all = await fetchOracoesEucaristicas();
  return all[id] ?? null;
}

/** Extrai orações próprias e antífonas da resposta CNBB da missa. */
export function extractOracoesFromMissa(missa) {
  const cnbb = missa?.cnbb;
  if (!cnbb) return null;

  const oracoes = cnbb.oracoes ?? {};
  const antifonas = cnbb.antifonas ?? {};

  return {
    coleta: oracoes.coleta ?? "",
    oferendas: oracoes.oferendas ?? "",
    comunhao: oracoes.comunhao ?? "",
    extras: oracoes.extras ?? [],
    antifonaEntrada: antifonas.entrada ?? "",
    antifonaComunhao: antifonas.comunhao ?? "",
  };
}

export function isLiturgicalSection(sec) {
  return sec?.kind === "oracao" || sec?.kind === "oe";
}

export function sectionPlaceholder(sec) {
  if (sec?.kind === "oracao") {
    return "Texto da oração do dia ou cole aqui…";
  }
  if (sec?.kind === "oe") {
    return "Carregue um modelo de Oração Eucarística (botão acima) ou cole o texto do missal…";
  }
  return null;
}
