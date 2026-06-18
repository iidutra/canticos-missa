import { Router } from "express";
import { fetchFromCifraClub } from "../cifraclub.js";

const router = Router();

router.get("/fetch", async (req, res) => {
  try {
    const name = req.query.name?.trim();
    const artist = req.query.artist?.trim() || "";
    if (!name) {
      res.status(400).json({ error: "Nome obrigatório" });
      return;
    }
    const result = await fetchFromCifraClub(name, artist);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message || "Erro ao buscar no Cifra Club" });
  }
});

export default router;
