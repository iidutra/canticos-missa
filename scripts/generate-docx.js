/**
 * Gera canticos-da-missa.docx a partir de um JSON de repertório.
 *
 * Uso:
 *   node scripts/generate-docx.js repertorio.json
 *   node scripts/generate-docx.js repertorio.json saida.docx
 *
 * Formato do JSON (sections usa os mesmos ids da app):
 * {
 *   "sections": {
 *     "entrada": { "included": true, "songName": "...", "lyrics": "..." }
 *   }
 * }
 */

import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

const SECTIONS = [
  { id: "refrao", label: "Refrão Orante" },
  { id: "entrada", label: "Entrada" },
  { id: "ato", label: "Ato Penitencial" },
  { id: "gloria", label: "Hino de Louvor (Glória)" },
  { id: "salmo", label: "Salmo Responsorial" },
  { id: "aclamacao", label: "Aclamação" },
  { id: "ofertorio", label: "Ofertório" },
  { id: "santo", label: "Santo" },
  { id: "cordeiro", label: "Cordeiro" },
  { id: "comunhao", label: "Comunhão" },
  { id: "pos", label: "Pós-Comunhão" },
  { id: "consagracao", label: "Consagração" },
  { id: "final", label: "Canto Final" },
  { id: "final2", label: "Canto Final 2" },
];

function lyricsToParagraphs(lyrics) {
  const paragraphs = [];
  for (const line of lyrics.split("\n")) {
    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 160 } }));
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, font: "Arial", size: 22 })],
          spacing: { after: 40, line: 276 },
        })
      );
    }
  }
  return paragraphs;
}

function buildDocument(data) {
  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [
        new TextRun({
          text: "Cânticos da Missa",
          bold: true,
          font: "Arial",
          size: 32,
        }),
      ],
    }),
  ];

  for (const sec of SECTIONS) {
    const block = data.sections?.[sec.id];
    if (!block?.included || !block.lyrics?.trim()) continue;

    children.push(
      new Paragraph({
        spacing: { before: 360, after: 200 },
        children: [
          new TextRun({
            text: sec.label.toUpperCase(),
            bold: true,
            font: "Arial",
            size: 24,
          }),
        ],
      })
    );
    children.push(...lyricsToParagraphs(block.lyrics.trim()));
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children,
      },
    ],
  });
}

const inputPath = process.argv[2];
const outputPath = process.argv[3] || "canticos-da-missa.docx";

if (!inputPath) {
  console.error("Uso: node scripts/generate-docx.js <repertorio.json> [saida.docx]");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
const doc = buildDocument(data);
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(path.resolve(outputPath), buffer);
console.log(`Documento gerado: ${outputPath}`);
