import { Router } from "express";
import { fetchMassByDate, fetchUpcoming } from "../musicasparamissa.js";
import { getMergedCalendar, syncCalendarStore } from "../calendar-store.js";

const router = Router();

router.get("/calendar", async (_req, res) => {
  try {
    const { calendar, meta } = await getMergedCalendar();
    res.json({
      calendar,
      upcoming: await fetchUpcoming(calendar),
      meta,
    });
  } catch (err) {
    res.status(502).json({ error: err.message || "Erro ao buscar calendário" });
  }
});

router.post("/sync", async (_req, res) => {
  try {
    const result = await syncCalendarStore();
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message || "Erro ao sincronizar calendário" });
  }
});

router.get("/missa", async (req, res) => {
  try {
    const date = req.query.date?.trim();
    if (!date) {
      res.status(400).json({ error: "Parâmetro date obrigatório (DD/MM/AAAA)" });
      return;
    }
    const { calendar } = await getMergedCalendar();
    const missa = await fetchMassByDate(date, calendar);
    if (!missa) {
      res.status(404).json({ error: "Liturgia indisponível para esta data" });
      return;
    }
    res.json(missa);
  } catch (err) {
    res.status(502).json({ error: err.message || "Erro ao buscar liturgia" });
  }
});

export default router;
