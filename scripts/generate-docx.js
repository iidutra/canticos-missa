/**
 * Gera canticos-da-missa.docx a partir de um JSON de repertório.
 *
 * Uso:
 *   node scripts/generate-docx.js repertorio.json
 *   node scripts/generate-docx.js repertorio.json saida.docx
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
import { SECTIONS, EXPORT_DOC_TITLE, exportSectionLabel } from "../src/constants.js";
import { prepareLyricsForExport } from "../src/lib/transpose.js";

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
          text: EXPORT_DOC_TITLE,
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
            text: exportSectionLabel(sec.id),
            bold: true,
            font: "Arial",
            size: 24,
          }),
        ],
      })
    );
    children.push(...lyricsToParagraphs(prepareLyricsForExport(block.lyrics)));
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
