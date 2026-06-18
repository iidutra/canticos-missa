import { Router } from "express";
import multer from "multer";
import { extractWordText, isWordFilename } from "../word-import.js";

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
    if (!isWordFilename(req.file.originalname)) {
      res.status(400).json({ error: "Envie um arquivo .doc ou .docx" });
      return;
    }
    const text = await extractWordText(req.file.buffer);
    if (!text?.trim()) {
      res.status(422).json({ error: "Documento vazio ou ilegível" });
      return;
    }
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: err.message || "Erro ao ler documento Word" });
  }
});

export default router;
