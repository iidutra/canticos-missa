import { extractWordText, isWordFilename } from "./word-import.js";
import { extractPdfText, isPdfFilename } from "./pdf-extract.js";

export { isWordFilename, isPdfFilename };

export function isDocumentFilename(name, mimeType = "") {
  if (isPdfFilename(name) || isWordFilename(name)) return true;
  const mime = (mimeType || "").toLowerCase();
  return (
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export async function extractDocumentText(buffer, filename, mimeType = "") {
  const mime = (mimeType || "").toLowerCase();
  if (isPdfFilename(filename) || mime === "application/pdf") {
    return extractPdfText(buffer);
  }
  if (
    isWordFilename(filename) ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractWordText(buffer);
  }
  throw new Error("Formato não suportado. Use PDF, DOC ou DOCX.");
}
