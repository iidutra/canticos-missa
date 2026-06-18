import fs from "fs";
import { transposeLyrics, hasChords, stripChordsFromLyrics } from "../src/lib/transpose.js";

const txt = fs.readFileSync("scripts/test-cifra.txt", "utf8");
console.log("hasChords:", hasChords(txt));
console.log("\n--- +2 semitons (D -> E) ---\n");
console.log(transposeLyrics(txt, 2, 2));
console.log("\n--- strip (folheto) ---\n");
console.log(stripChordsFromLyrics(txt));
