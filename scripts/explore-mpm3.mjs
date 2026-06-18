import fs from "fs";

const html = fs.readFileSync("scripts/mpm-sample.html", "utf8");

// Extract evangelho section content
const evMatch = html.match(/Evangelho \(Mt[^<]+[\s\S]*?accordion-inner([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<div class="accordion-heading/);
console.log("Evangelho inner:", evMatch?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500));

// primeira leitura
const p1 = html.match(/Primeira Leitura[\s\S]*?accordion-inner([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<div class="accordion-heading/);
console.log("\nPrimeira inner:", p1?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500));

// song suggestions for entrada
const entrada = html.match(/Canto de Abertura[\s\S]*?accordion-inner([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<div class="accordion-heading/);
const songs = [...(entrada?.[1]?.matchAll(/href="(\/musica\/[^"]+)"[^>]*>\s*([^<]+)/g) || [])].map((m) => ({ url: m[1], name: m[2].trim() }));
console.log("\nEntrada songs:", songs.slice(0, 5));
