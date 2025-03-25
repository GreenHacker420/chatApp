import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // ✅ Ensure it outputs to `dist`
    emptyOutDir: true, // ✅ Clears old files before building
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173, // ✅ Local dev server port
  },
});
