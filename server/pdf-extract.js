import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

function groupItemsIntoLines(items, tolerance = 3) {
  const positioned = items
    .filter((it) => it.str?.trim())
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width ?? it.str.length * 5,
    }));

  positioned.sort((a, b) => b.y - a.y || a.x - b.x);

  const rows = [];
  for (const item of positioned) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= tolerance);
    if (row) {
      row.items.push(item);
      row.y = (row.y + item.y) / 2;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows.map((row) => {
    row.items.sort((a, b) => a.x - b.x);
    let out = "";
    let lastEnd = null;
    for (const p of row.items) {
      if (lastEnd !== null) {
        const gap = p.x - lastEnd;
        if (gap > 14) out += " ".repeat(Math.min(Math.max(Math.round(gap / 5), 2), 24));
        else if (gap > 3) out += " ";
      }
      out += p.str;
      lastEnd = p.x + (p.w || p.str.length * 5);
    }
    return out.replace(/\s+$/, "");
  });
}

export async function extractPdfText(buffer) {
  const data = new Uint8Array(buffer);
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  const pageTexts = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pageTexts.push(groupItemsIntoLines(content.items).join("\n"));
  }

  const text = pageTexts.join("\n").trim();
  if (!text) {
    throw new Error(
      "O PDF não contém texto selecionável. Se for um scan/foto, exporte com OCR ou use um PDF gerado digitalmente."
    );
  }
  return text;
}

export function isPdfFilename(name) {
  return /\.pdf$/i.test(name || "");
}
