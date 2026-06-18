import {
  fetchMassByDate,
  fetchUpcoming,
  defaultSelectedDate,
} from "./musicasparamissa.js";
import { getMergedCalendar, syncCalendarStore } from "./calendar-store.js";

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export function liturgiaApiPlugin() {
  const handler = async (req, res, pathname) => {
    try {
      const url = new URL(req.url, "http://localhost");

      if (pathname === "/api/liturgia/calendar") {
        const { calendar, meta } = await getMergedCalendar();
        sendJson(res, 200, {
          calendar,
          upcoming: await fetchUpcoming(calendar),
          meta,
        });
        return;
      }

      if (pathname === "/api/liturgia/sync" && req.method === "POST") {
        const result = await syncCalendarStore();
        sendJson(res, 200, result);
        return;
      }

      if (pathname === "/api/liturgia/missa") {
        const date = url.searchParams.get("date")?.trim();
        if (!date) {
          sendJson(res, 400, { error: "Parâmetro date obrigatório (DD/MM/AAAA)" });
          return;
        }
        const { calendar } = await getMergedCalendar();
        const missa = await fetchMassByDate(date, calendar);
        if (!missa) {
          sendJson(res, 404, { error: "Liturgia indisponível para esta data" });
          return;
        }
        sendJson(res, 200, missa);
        return;
      }

      sendJson(res, 404, { error: "Rota não encontrada" });
    } catch (err) {
      sendJson(res, 502, { error: err.message || "Erro ao buscar liturgia" });
    }
  };

  const attach = (server) => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith("/api/liturgia/")) {
        const pathname = req.url.split("?")[0];
        handler(req, res, pathname);
        return;
      }
      next();
    });
  };

  return {
    name: "liturgia-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export { defaultSelectedDate };
