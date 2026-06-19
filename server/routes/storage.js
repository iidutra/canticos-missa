import { Router } from "express";
import { getAppData, setAppData, isDbEnabled } from "../db.js";

const ALLOWED_KEYS = new Set(["lib", "reps", "cur", "ptab"]);

function parsePayload(body) {
  const raw = body?.value ?? body?.payload ?? body;
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, db: isDbEnabled() });
});

router.get("/:key", async (req, res) => {
  if (!isDbEnabled()) {
    res.status(503).json({ error: "Banco de dados não configurado" });
    return;
  }
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) {
    res.status(400).json({ error: "Chave inválida" });
    return;
  }
  try {
    const payload = await getAppData(key);
    if (payload == null) {
      res.json({ value: null });
      return;
    }
    res.json({ value: typeof payload === "string" ? payload : JSON.stringify(payload) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:key", async (req, res) => {
  if (!isDbEnabled()) {
    res.status(503).json({ error: "Banco de dados não configurado" });
    return;
  }
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) {
    res.status(400).json({ error: "Chave inválida" });
    return;
  }
  const payload = parsePayload(req.body);
  if (payload == null) {
    res.status(400).json({ error: "Corpo inválido" });
    return;
  }
  try {
    await setAppData(key, payload);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
