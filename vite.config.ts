import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// manualChunks below is intentionally narrow. A wider hand-written grouping
// (react/react-dom in one chunk, primereact in another, i18next and
// @radix-ui each in their own) was tried first to make more vendor code
// cacheable separately from app code, but several of those libraries call
// React APIs (React.createContext, React.forwardRef, ...) at their own
// module's top level, and splitting them out of react's chunk let the
// browser execute that code before vendor-react had run — every production
// build crashed instantly with "Cannot read properties of undefined
// (reading 'createContext'/'forwardRef')" depending on which chunk's script
// tag happened to load first. react-router-dom does NOT call React APIs at
// its own module top level (it only uses them inside component bodies,
// which only run once React itself is already loaded), so splitting it out
// is safe; primereact and @radix-ui are not, so they stay wherever Rollup's
// own automatic chunking puts them. If you're tempted to add another entry
// here, verify it against a real `vite build && vite preview` production
// build first (not `vite dev` — dev mode never round-trips through this
// code path at all) by loading a few real routes and checking the browser
// console for a ReferenceError before assuming it's safe.
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
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
          if (/[\\/]node_modules[\\/]react-router-dom[\\/]/.test(id)) return "vendor-router";
          return undefined;
        },
      },
    },
  },
});
