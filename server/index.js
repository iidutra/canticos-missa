import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import { initDb, importCalendarFileToDbIfEmpty } from "./db.js";
import storageRouter from "./routes/storage.js";
import liturgiaRouter from "./routes/liturgia.js";
import cifraclubRouter from "./routes/cifraclub.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT) || 3000;

const app = express();

app.use(compression());
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    db: Boolean(process.env.DATABASE_URL),
  });
});

app.use("/api/storage", storageRouter);
app.use("/api/liturgia", liturgiaRouter);
app.use("/api/cifraclub", cifraclubRouter);

app.use(express.static(DIST, { maxAge: "1d", index: false }));

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Rota não encontrada" });
    return;
  }
  res.sendFile(path.join(DIST, "index.html"), (err) => {
    if (err) next(err);
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

try {
  await initDb();
  await importCalendarFileToDbIfEmpty();
} catch (err) {
  console.error("[db] Falha na inicialização:", err.message);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Cânticos da Missa — http://0.0.0.0:${PORT}`);
});
