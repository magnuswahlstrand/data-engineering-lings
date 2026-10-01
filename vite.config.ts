import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@duckdb") || id.includes("apache-arrow"))
            return "duckdb";
          if (id.includes("codemirror") || id.includes("@lezer"))
            return "editor";
        },
      },
    },
  },
  optimizeDeps: { exclude: ["@duckdb/duckdb-wasm"] },
});
