import fs from "fs";

const html = fs.readFileSync("scripts/mpm-sample.html", "utf8");

// Extract accordion headings
const headings = [...html.matchAll(/accordion-toggle[^>]*>([^<]*(?:<[^>]+>[^<]*)*?)<\/a>/gi)]
  .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
  .filter(Boolean);
console.log("Headings:", headings.slice(0, 20));

// Find reading text blocks
const readingBlocks = [...html.matchAll(/class="accordion-inner"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi)];
console.log("Reading blocks count:", readingBlocks.length);

// Look for reflexão panel
const reflexMatch = html.match(/Reflex[^<]{0,20}[\s\S]{0,2000}/i);
console.log("\nReflex snippet:", reflexMatch?.[0]?.slice(0, 800));

// calendar script
const scripts = [...html.matchAll(/src="([^"]*calendar[^"]*)"/gi)].map((m) => m[1]);
console.log("\nCalendar scripts:", scripts);

// try minhas subdomain
for (const u of [
  "https://minhas.musicasparamissa.com.br/api/calendario?mes=6&ano=2026",
  "https://musicasparamissa.com.br/js/calendar.min.js",
  "https://s3.sa-east-1.amazonaws.com/static.musicasparamissa.com.br/js/calendar.min.js",
]) {
  try {
    const r = await fetch(u);
    const t = await r.text();
    console.log("\n", u, r.status, t.slice(0, 400));
  } catch (e) {
    console.log(u, e.message);
  }
}
