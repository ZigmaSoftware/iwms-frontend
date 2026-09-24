import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Bucket large, slow-changing vendor deps into their own chunks
        // instead of one monolithic vendor bundle, so a change to app code
        // doesn't invalidate the cache for React/PrimeReact/etc, and the
        // browser can fetch/cache them independently.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
          if (/[\\/]node_modules[\\/]react-router-dom[\\/]/.test(id)) return "vendor-router";
          if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return "vendor-radix";
          if (/[\\/]node_modules[\\/](primereact|primeicons)[\\/]/.test(id)) return "vendor-primereact";
          if (/[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/.test(id)) return "vendor-i18n";
          return undefined;
        },
      },
    },
  },
});
