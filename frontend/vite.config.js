import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // ✅ Ensures build output is placed in "dist/"
  },
  server: {
    port: 5173,
  },
});
