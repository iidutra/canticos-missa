import { Router } from "express";
import multer from "multer";
import { extractDocumentText, isDocumentFilename } from "../document-import.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = Router();

router.post("/extract-text", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ error: "Arquivo obrigatório" });
      return;
    }
    if (!isDocumentFilename(req.file.originalname, req.file.mimetype)) {
      res.status(400).json({ error: "Envie um arquivo PDF, DOC ou DOCX" });
      return;
    }
    const text = await extractDocumentText(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    if (!text?.trim()) {
      res.status(422).json({ error: "Documento vazio ou ilegível" });
      return;
    }
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: err.message || "Erro ao ler documento" });
  }
});

export default router;
