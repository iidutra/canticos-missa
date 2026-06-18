import { SECTIONS } from "../constants.js";
import { lyricsForExport } from "./transpose.js";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function genDocHtml(sections) {
  const inc = SECTIONS.filter(
    (s) => sections[s.id]?.included && sections[s.id]?.lyrics?.trim()
  );
  let h =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">' +
    '<head><meta charset="utf-8"><style>' +
    "@page{size:A4;margin:2cm}body{font-family:Arial,sans-serif;font-size:11pt;color:#333;margin:2cm}" +
    "h1{font-size:16pt;font-weight:bold;text-align:center;margin-bottom:24pt}" +
    "h2{font-size:12pt;font-weight:bold;text-transform:uppercase;margin-top:18pt;margin-bottom:10pt}" +
    "p{margin:2pt 0;line-height:1.4}.g{margin:8pt 0}" +
    "</style></head><body><h1>Cânticos da Missa</h1>";
  inc.forEach((s) => {
    h += `<h2>${escapeHtml(s.label)}</h2>`;
    lyricsForExport(sections[s.id].lyrics)
      .trim()
      .split("\n")
      .forEach((l) => {
        h +=
          l.trim() === ""
            ? '<p class="g">&nbsp;</p>'
            : `<p>${escapeHtml(l)}</p>`;
      });
  });
  h += "</body></html>";
  return h;
}

export function downloadDoc(sections, filename = "canticos-da-missa.doc") {
  const h = genDocHtml(sections);
  downloadBlob(new Blob([h], { type: "application/msword" }), filename);
}

function lyricsToDocxParagraphs(lyrics, Paragraph, TextRun) {
  const paragraphs = [];
  for (const line of lyrics.split("\n")) {
    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ spacing: { after: 160 } }));
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

export async function downloadDocx(sections, filename = "canticos-da-missa.docx") {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
  const inc = SECTIONS.filter(
    (s) => sections[s.id]?.included && sections[s.id]?.lyrics?.trim()
  );
  const children = [
    new Paragraph({
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
  for (const sec of inc) {
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
    children.push(
      ...lyricsToDocxParagraphs(
        lyricsForExport(sections[sec.id].lyrics).trim(),
        Paragraph,
        TextRun
      )
    );
  }
  const doc = new Document({
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
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

export function downloadJson(data, filename) {
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename
  );
}
