import fs from "fs";

const txt = fs.readFileSync("scripts/test-cifra.txt", "utf8");
const line = "1. Profetas te ouviram e seguiram tua voz";

const CHORD_RE =
  /(?<![A-Za-zÀ-ú0-9])([A-G]|Dó|DÓ|Ré|RÉ|Mi|MÍ|Fá|FÁ|Sol|SOL|Lá|LÁ|Si|SI|Do|DO|Re|RE|Fa|FA|La|LA)([#b♭♯]?)(?:(?:maj|M|min|dim|aug|sus2|sus4|add\d+|maj7|m7|M7|7|dim7|°|º|\+|6|9|11|13|sus)*)?(?:\/([A-G]|Dó|Ré|Mi|Fá|Sol|Lá|Si|Do|Re|Fa|La|SI)([#b♭♯]?))?(?=[\s,;:\]|\).]|\/|$)/gi;

for (const s of [line, "Andaram mundo afora e pregaram sem temor"]) {
  console.log("Testing:", s);
  CHORD_RE.lastIndex = 0;
  let m;
  while ((m = CHORD_RE.exec(s)) !== null) {
    console.log("  match:", JSON.stringify(m[0]), "root:", m[1], "codes:", [...m[0]].map(c => c.charCodeAt(0)));
  }
}

console.log("\nFull file:");
CHORD_RE.lastIndex = 0;
let m;
while ((m = CHORD_RE.exec(txt)) !== null) {
  if (m[0].length <= 2 && m[0] === m[0].toLowerCase()) {
    const ctx = txt.slice(Math.max(0, m.index - 10), m.index + m[0].length + 10).replace(/\n/g, "↵");
    console.log("SUSPICIOUS:", JSON.stringify(m[0]), "root:", m[1], "ctx:", ctx);
  }
}
