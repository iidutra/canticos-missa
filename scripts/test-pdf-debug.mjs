import { parsePdfText, matchSectionHeader } from "../src/lib/pdf-import.js";

console.log("ENTRADA ->", matchSectionHeader("ENTRADA"));
console.log("Tom test ->", /^tom\s*[:：]/i.test("Tom: Sol (G)"));

const sample = `12º Domingo do Tempo Comum – Ano A
21/06/2026

ENTRADA
O SENHOR É A FORÇA DE SEU POVO
Tom: Sol (G)

 G             C
Senhor, se Tu me chamas
 D7           G
Eu quero te ouvir`;

const lines = sample.split("\n");
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  const n = lines[i + 1]?.trim();
  if (t.includes("SENHOR") || t.startsWith("Tom")) {
    console.log(i, JSON.stringify(t), "next:", JSON.stringify(n), "tomNext:", /^tom\s*[:：]/i.test(n || ""));
  }
}

console.log(JSON.stringify(parsePdfText(sample).sections[0], null, 2));
