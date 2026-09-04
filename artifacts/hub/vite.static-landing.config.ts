import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const page = process.env.LANDING_PAGE;

const entries = {
  sistema: path.resolve(import.meta.dirname, "src/static-exports/lp-sistema-mirage.tsx"),
  black: path.resolve(import.meta.dirname, "src/static-exports/lp-black-mirage.tsx"),
} as const;

if (page !== "sistema" && page !== "black") {
  throw new Error('Defina LANDING_PAGE como "sistema" ou "black".');
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, `.static-landing-build/${page}`),
    emptyOutDir: true,
    lib: {
      entry: entries[page],
      formats: ["iife"],
      name: "MirageLanding",
      fileName: () => "landing.js",
      cssFileName: "landing",
    },
    rollupOptions: {
      output: {
        assetFileNames: "landing.[ext]",
      },
    },
  },
});