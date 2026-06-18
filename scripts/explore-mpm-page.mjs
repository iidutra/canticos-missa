const slug = process.argv[2] || "12o-domingo-do-tempo-comum-ano-a";
const url = `https://musicasparamissa.com.br/sugestoes-para/${slug}/`;
console.log("Fetching", url);
const res = await fetch(url, {
  headers: { "User-Agent": "CanticosDaMissa/1.0", "Accept-Language": "pt-BR" },
});
console.log("Status", res.status);
const html = await res.text();
console.log("Length", html.length);

// Save snippet
import fs from "fs";
fs.writeFileSync("scripts/mpm-sample.html", html);

const title = html.match(/<title>([^<]+)/i)?.[1];
console.log("Title:", title);

// Look for liturgy sections
for (const kw of ["liturgia", "leitura", "evangelho", "salmo", "reflex", "primeira", "segunda"]) {
  const idx = html.toLowerCase().indexOf(kw);
  if (idx >= 0) console.log(kw, "at", idx, html.slice(idx, idx + 120).replace(/\s+/g, " "));
}

// song links
const songs = [...html.matchAll(/href="(\/musica\/[^"]+)"/g)].map((m) => m[1]);
console.log("\nSong links:", songs.slice(0, 10));

// calendar API?
for (const u of [
  "https://musicasparamissa.com.br/calendario/",
  "https://musicasparamissa.com.br/api/calendario",
  "https://musicasparamissa.com.br/js/calendar.js",
]) {
  try {
    const r = await fetch(u);
    console.log(u, r.status);
  } catch {}
}
