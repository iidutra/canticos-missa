const s = "ouviram e seguiram";
const parts = ["[A-G]", "Dó", "Ré", "Mi", "mi", "Fá", "Sol", "Lá", "Si", "si", "Do", "Re", "Fa", "La", "LA"];
for (const p of parts) {
  const re = new RegExp(`(?<![A-Za-zÀ-ú0-9])(${p})`, "gi");
  let m;
  while ((m = re.exec(s)) !== null) {
    console.log(p, "->", JSON.stringify(m[0]), "at", m.index);
  }
}
