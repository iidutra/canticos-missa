import WordExtractor from "word-extractor";

const extractor = new WordExtractor();

export async function extractWordText(buffer) {
  const doc = await extractor.extract(buffer);
  return doc.getBody();
}

export function isWordFilename(name) {
  return /\.(docx?)$/i.test(name || "");
}
