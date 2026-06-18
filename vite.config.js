import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cifraClubApiPlugin } from "./server/vite-plugin-cifraclub.js";
import { liturgiaApiPlugin } from "./server/vite-plugin-liturgia.js";
import { importApiPlugin } from "./server/vite-plugin-import.js";

export default defineConfig({
  plugins: [react(), cifraClubApiPlugin(), liturgiaApiPlugin(), importApiPlugin()],
});
