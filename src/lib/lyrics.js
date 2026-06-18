function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function buildCifraClubSearchUrl(name, artist) {
  const q = artist ? `${name} ${artist}` : name;
  return `https://www.cifraclub.com.br/?q=${encodeURIComponent(q)}`;
}

export function buildCifraClubUrl(name, artist) {
  if (artist) {
    return `https://www.cifraclub.com.br/${slugify(artist)}/${slugify(name)}/`;
  }
  return buildCifraClubSearchUrl(name);
}

/** @deprecated use buildCifraClubSearchUrl */
export function buildLetrasUrl(name, artist) {
  return buildCifraClubSearchUrl(name, artist);
}

export async function fetchLyrics(name, artist) {
  try {
    const params = new URLSearchParams({ name });
    if (artist?.trim()) params.set("artist", artist.trim());
    const r = await fetch(`/api/cifraclub/fetch?${params}`);
    if (!r.ok) {
      return {
        lyrics: null,
        key: null,
        url: buildCifraClubSearchUrl(name, artist),
        songName: name,
        artist: artist || "",
      };
    }
    const data = await r.json();
    if (data.error) {
      return {
        lyrics: null,
        key: null,
        url: buildCifraClubSearchUrl(name, artist),
        songName: name,
        artist: artist || "",
      };
    }
    return {
      lyrics: data.lyrics,
      key: data.key || null,
      url: data.url || buildCifraClubSearchUrl(name, artist),
      songName: data.songName || name,
      artist: data.artist || artist || "",
    };
  } catch {
    return {
      lyrics: null,
      key: null,
      url: buildCifraClubSearchUrl(name, artist),
      songName: name,
      artist: artist || "",
    };
  }
}
