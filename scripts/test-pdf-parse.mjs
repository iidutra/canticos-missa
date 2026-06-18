import { parsePdfText } from "../src/lib/pdf-import.js";

const sample = `
12º Domingo do Tempo Comum – Ano A
21/06/2026

ENTRADA
O SENHOR É A FORÇA DE SEU POVO
Tom: Sol (G)

 G             C
Senhor, se Tu me chamas
 D7           G
Eu quero te ouvir

ATO PENITENCIAL
SENHOR, QUE VIESTES SALVAR
Tom: Dó (C)

 C           Am
Senhor, que viestes salvar

GLÓRIA
GLÓRIA A DEUS NAS ALTURAS
Tom: Sol (G)

 G
Glória a Deus nas alturas

COMUNHÃO
EIS QUE SOU O PÃO DA VIDA
Tom: Ré (D)

 D        G
Eis que sou o pão da vida
`;

const r = parsePdfText(sample);
console.log(JSON.stringify(r, null, 2));

// Formato folheto: Seção: Título + Tom na linha seguinte
const folheto = `
Refrão Orante: Meu Apelo
Tom: Cm
 Cm   Fm
OUVI, SENHOR, A VOZ DO MEU APELO

Entrada: Agora É Tempo de Ser Igreja
Tom: D
 D   G
Agora é tempo de ser igreja
`;

const f = parsePdfText(folheto);
console.log("\nFolheto:", f.sections.map((s) => `${s.sectionId}: ${s.songs[0]?.title} (${s.songs[0]?.key})`).join(" | "));
