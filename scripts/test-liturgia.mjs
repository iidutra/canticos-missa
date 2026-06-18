import {
  fetchCalendar,
  fetchMassByDate,
  defaultSelectedDate,
} from "../server/musicasparamissa.js";

const cal = await fetchCalendar();
console.log("Calendar days:", Object.keys(cal).length);
const date = defaultSelectedDate(cal);
console.log("Default date:", date);

const missa = await fetchMassByDate(date, cal);
console.log("Title:", missa.title);
console.log("Reflection:", missa.reflection);
console.log("Readings:", missa.readings.map((r) => `${r.kind}: ${r.reference} — ${r.theme}`));
console.log("Song sections:", missa.songs.map((s) => `${s.sectionLabel}: ${s.items.length} (${s.items[0]?.name?.slice(0, 50)})`));
