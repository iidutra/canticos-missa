const STORAGE_KEY = "ptab";

export function buildPresentationContextKey(slides, meta = {}) {
  const ids = slides.map((s) => s.id).join(",");
  const prefix = meta.repId
    ? `rep:${meta.repId}`
    : [meta.missDate, meta.missTitle].filter(Boolean).join(" · ") || "repertorio-atual";
  return `${prefix}::${ids}`;
}

async function readStore() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    if (!r?.value) return { contexts: {}, prefs: {} };
    return JSON.parse(r.value);
  } catch {
    return { contexts: {}, prefs: {} };
  }
}

async function writeStore(data) {
  await window.storage.set(STORAGE_KEY, JSON.stringify(data));
}

export async function loadPresentationContext(contextKey) {
  const data = await readStore();
  return data.contexts?.[contextKey] ?? null;
}

export async function loadGlobalPresentationPrefs() {
  const data = await readStore();
  return data.prefs ?? {};
}

export async function savePresentationContext(contextKey, partial) {
  const data = await readStore();
  const prev = data.contexts[contextKey] ?? { tabs: {}, tabDraws: {}, keys: {}, prefs: {} };
  data.contexts[contextKey] = {
    tabs: partial.tabs ? { ...prev.tabs, ...partial.tabs } : prev.tabs,
    tabDraws: partial.tabDraws
      ? { ...(prev.tabDraws ?? {}), ...partial.tabDraws }
      : prev.tabDraws ?? {},
    keys: partial.keys ? { ...prev.keys, ...partial.keys } : prev.keys,
    prefs: partial.prefs ? { ...prev.prefs, ...partial.prefs } : prev.prefs,
  };
  if (partial.prefsGlobal) {
    data.prefs = { ...data.prefs, ...partial.prefsGlobal };
  }
  await writeStore(data);
}

export const TAB_PLACEHOLDER = `Exemplo (edite na tela):
Bumbo:  X . . .
Caixa:  . . X .
Chimbal: x x x x

1  e  2  e  3  e  4  e
.  .  .  .  .  .  .  .`;
