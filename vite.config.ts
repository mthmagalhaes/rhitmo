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
  build: {
    rollupOptions: {
      output: {
        // Group heavy 3rd-party libs into stable vendor chunks so route
        // chunks stay small AND vendor chunks survive deploys (better
        // browser cache hit-rate between releases).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router')) return 'vendor-react';
          if (id.match(/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/)) {
            return 'vendor-react';
          }
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap';
          if (id.includes('pdfjs-dist') || id.includes('mammoth')) return 'vendor-pdf';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('react-markdown') || id.includes('marked') || id.includes('dompurify')) {
            return 'vendor-markdown';
          }
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('lucide-react')) return 'vendor-lucide';
          if (id.includes('date-fns')) return 'vendor-date';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
          return undefined;
        },
      },
    },
  },
}));
