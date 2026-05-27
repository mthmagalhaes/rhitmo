import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: [
      "@tanstack/react-query",
      "@tiptap/extension-highlight",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-placeholder",
    ],
  },
  // NOTE: manualChunks intentionally removed. Splitting React-dependent
  // libraries (i18n, radix, tiptap, etc.) into separate vendor chunks created
  // cross-chunk import cycles (vendor-i18n <-> vendor-react), causing
  // "Cannot read properties of undefined (reading 'createContext')" at boot
  // and a fully blank app in production. Let Rollup/Vite colocate vendors
  // with the routes that import them.
}));
