const SOLR_URL = "https://solr.sscdn.co/cc/v3/search/";
const CC_BASE = "https://www.cifraclub.com.br";

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const KEY_PT = {
  C: "Dó", Db: "Ré♭", D: "Ré", Eb: "Mi♭", E: "Mi", F: "Fá",
  Gb: "Sol♭", G: "Sol", Ab: "Lá♭", A: "Lá", Bb: "Si♭", B: "Si",
  "C#": "Dó#", "D#": "Ré#", "F#": "Fá#", "G#": "Sol#", "A#": "Lá#",
};

export function formatKey(key) {
  if (!key) return "";
  const k = key.trim();
  const pt = KEY_PT[k] || KEY_PT[k.replace("b", "b")];
  return pt ? `${pt} (${k})` : k;
}

function parseSolrBody(text) {
  const json = text.trim().replace(/^suggest_callback\(/, "").replace(/\)\s*$/, "");
  return JSON.parse(json);
}

export async function searchCifraClub(query, artist) {
  const q = artist ? `${query} ${artist}`.trim() : query.trim();
  const url = `${SOLR_URL}?q=${encodeURIComponent(q)}&limit=12`;
  const res = await fetch(url, {
    headers: { "User-Agent": "CanticosDaMissa/1.0" },
  });
  if (!res.ok) throw new Error("Busca indisponível");
  const data = parseSolrBody(await res.text());
  const docs = data?.response?.docs ?? [];
  if (!docs.length) return null;

  if (artist) {
    const a = artist.toLowerCase();
    const slug = slugify(artist);
    const byArtist = docs.find(
      (d) =>
        d.dns === slug ||
        d.art?.toLowerCase() === a ||
        d.art?.toLowerCase().includes(a) ||
        slugify(d.art) === slug
    );
    if (byArtist) return byArtist;
  }
  return docs[0];
}

function htmlPreToCifra(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<b>([^<]+)<\/b>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseCifraPage(html) {
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!preMatch) return null;

  const keyMatch =
    html.match(/id="cifra_tom"[^>]*>tom:\s*<a[^>]*>([^<]+)</i) ||
    html.match(/\bkey:\s*'([^']+)'/);

  const lyrics = htmlPreToCifra(preMatch[1]);
  if (!lyrics || lyrics.length < 20) return null;

  const rawKey = keyMatch?.[1]?.trim() ?? "";
  return { lyrics, key: formatKey(rawKey), rawKey };
}

export async function fetchCifraPage(artistSlug, songSlug) {
  const url = `${CC_BASE}/${artistSlug}/${songSlug}/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  if (!res.ok) throw new Error("Página não encontrada");
  return { html: await res.text(), url };
}

export async function fetchFromCifraClub(name, artist) {
  const hit = await searchCifraClub(name, artist);
  if (!hit?.dns || !hit?.url) {
    return {
      lyrics: null,
      key: null,
      url: buildCifraClubSearchUrl(name),
      songName: name,
      artist: artist || "",
      source: "cifraclub",
    };
  }

  const { html, url } = await fetchCifraPage(hit.dns, hit.url);
  const parsed = parseCifraPage(html);
  if (!parsed) {
    return {
      lyrics: null,
      key: null,
      url,
      songName: hit.txt || name,
      artist: hit.art || artist || "",
      source: "cifraclub",
    };
  }

  return {
    lyrics: parsed.lyrics,
    key: parsed.key,
    url,
    songName: hit.txt || name,
    artist: hit.art || artist || "",
    source: "cifraclub",
  };
}

export function buildCifraClubSearchUrl(name) {
  return `${CC_BASE}/?q=${encodeURIComponent(name)}`;
}

export function buildCifraClubUrl(artistSlug, songSlug) {
  return `${CC_BASE}/${artistSlug}/${songSlug}/`;
}
