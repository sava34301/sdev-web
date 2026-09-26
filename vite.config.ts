import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const cloudUrl = env.VITE_SUPABASE_URL || "https://ygzqjekxzvsrkhuqhqbp.supabase.co";
  const cloudPublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnenFqZWt4enZzcmtodXFocWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzU1NDEsImV4cCI6MjA4NTQ1MTU0MX0.--CgBH0g9CJsHC_pRoaNp1nDDQ8cQ5m-gQ0w7zlnjiY";

  return {
  // Electron loads assets via file://, which requires relative paths.
  // Set SDEV_ELECTRON=1 when building the desktop bundle; the web build stays absolute.
  base: process.env.SDEV_ELECTRON ? "./" : "/",
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
  },
  plugins: [react(), mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(cloudUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(cloudPublishableKey),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
