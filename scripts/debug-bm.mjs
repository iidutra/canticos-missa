import { readFileSync } from "fs";

const line = " Bm            Em";
const full = readFileSync("src/lib/transpose.js", "utf8");
const m = full.match(/const CHORD_RE =\n  ([^;]+);/);
const re = new RegExp(m[1].slice(1, -1)); // remove quotes
console.log("pattern", re.source.slice(0, 80));
console.log("match", line.match(re));

// Bisect suffix
const re2 = /(?<![A-Za-zÀ-ú0-9])([A-G])([#b♭♯]?)(?:(?:maj|min|dim|aug|sus2|sus4|add\d+|maj7|m7|M7|7|dim7|°|º|\+|6|9|11|13|sus|m))?(?=[\s,;:\]|\).]|\/|$)/g;
console.log("no M in suffix", line.match(re2));

const re3 = /(?<![A-Za-zÀ-ú0-9])([A-G])([#b♭♯]?)(?:(?:maj|M|min|dim|aug|sus2|sus4|add\d+|maj7|m7|M7|7|dim7|°|º|\+|6|9|11|13|sus)*)?(?=[\s,;:\]|\).]|\/|$)/g;
console.log("with M in suffix", line.match(re3));
