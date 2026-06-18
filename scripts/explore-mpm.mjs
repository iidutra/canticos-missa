const res = await fetch("https://musicasparamissa.com.br/");
const html = await res.text();

const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
const unique = [...new Set(links)];
console.log("Sample links:");
unique.filter((h) => !h.startsWith("#") && !h.includes("telegram")).slice(0, 60).forEach((l) => console.log(l));

const dates = [...html.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)].map((m) => m[1]);
console.log("\nDates found:", [...new Set(dates)].slice(0, 10));

// try API patterns
for (const url of [
  "https://musicasparamissa.com.br/wp-json/wp/v2/posts?per_page=3",
  "https://musicasparamissa.com.br/api/",
]) {
  try {
    const r = await fetch(url);
    console.log("\n", url, r.status, r.headers.get("content-type"));
    if (r.ok) console.log((await r.text()).slice(0, 500));
  } catch (e) {
    console.log(url, e.message);
  }
}
