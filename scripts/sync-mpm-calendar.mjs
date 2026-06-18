import { syncCalendarStore, loadCalendarStore } from "../server/calendar-store.js";

const result = await syncCalendarStore();
const store = await loadCalendarStore();
const dates = Object.keys(store.entries).sort((a, b) => {
  const pa = a.split("/").map(Number);
  const pb = b.split("/").map(Number);
  return new Date(pa[2], pa[1] - 1, pa[0]) - new Date(pb[2], pb[1] - 1, pb[0]);
});

console.log("Sync MPM concluído:");
console.log(`  Total no acervo: ${result.total}`);
console.log(`  Remoto nesta sync: ${result.remoteCount}`);
console.log(`  Novas entradas: ${result.added}`);
console.log(`  Intervalo: ${dates[0] ?? "—"} → ${dates[dates.length - 1] ?? "—"}`);
console.log(`  lastSyncAt: ${result.lastSyncAt}`);
