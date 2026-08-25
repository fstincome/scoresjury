import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Pure client-side SPA build: `vite build` emits a fully static site in dist/
// (index.html + assets) that can be uploaded as-is to any static host (cPanel).
export default defineConfig({
  base: "/",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});
