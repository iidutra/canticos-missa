import { fetchFromCifraClub } from "../server/cifraclub.js";

const result = await fetchFromCifraClub("Senhor Se Tu Me Chamas", "Edmilson Aparecido");
console.log("URL:", result.url);
console.log("Tom:", result.key);
console.log("Artista:", result.artist);
console.log("---");
console.log(result.lyrics?.slice(0, 400));
