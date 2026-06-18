import multer from "multer";
import { extractWordText, isWordFilename } from "./word-import.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

export function importApiPlugin() {
  const handler = async (req, res) => {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    try {
      await runMulter(req, res);
      if (!req.file?.buffer) {
        sendJson(res, 400, { error: "Arquivo obrigatório" });
        return;
      }
      if (!isWordFilename(req.file.originalname)) {
        sendJson(res, 400, { error: "Envie um arquivo .doc ou .docx" });
        return;
      }
      const text = await extractWordText(req.file.buffer);
      if (!text?.trim()) {
        sendJson(res, 422, { error: "Documento vazio ou ilegível" });
        return;
      }
      sendJson(res, 200, { text });
    } catch (err) {
      sendJson(res, 502, { error: err.message || "Erro ao ler documento Word" });
    }
  };

  const attach = (server) => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.split("?")[0] === "/api/import/extract-text") {
        handler(req, res);
        return;
      }
      next();
    });
  };

  return {
    name: "import-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
