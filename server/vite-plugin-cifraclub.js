import { fetchFromCifraClub } from "./cifraclub.js";

export function cifraClubApiPlugin() {
  const handler = async (req, res) => {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }
    try {
      const url = new URL(req.url, "http://localhost");
      const name = url.searchParams.get("name")?.trim();
      const artist = url.searchParams.get("artist")?.trim() || "";
      if (!name) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Nome obrigatório" }));
        return;
      }
      const result = await fetchFromCifraClub(name, artist);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(result));
    } catch (err) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "Erro ao buscar no Cifra Club" }));
    }
  };

  return {
    name: "cifraclub-api",
    configureServer(server) {
      server.middlewares.use("/api/cifraclub/fetch", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/cifraclub/fetch", handler);
    },
  };
}
