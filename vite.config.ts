import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import type { IncomingMessage, ServerResponse } from "http";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

function sdevDocsPlugin(): Plugin {
  const docsRoot = path.resolve(__dirname, "docs");
  let outDir = path.resolve(__dirname, "dist");

  const mimeFor = (filePath: string): string => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".md") return "text/markdown; charset=utf-8";
    if (ext === ".json") return "application/json; charset=utf-8";
    if (ext === ".txt") return "text/plain; charset=utf-8";
    return "application/octet-stream";
  };

  const docsMiddleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const rawUrl = (req.url || "").split("?")[0];
    if (!rawUrl.startsWith("/documentation/")) return next();

    let rel = "";
    try {
      rel = decodeURIComponent(rawUrl.slice("/documentation/".length));
    } catch {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }
    if (!rel || rel === "/") rel = "README.md";
    const resolved = path.resolve(docsRoot, rel);
    if (resolved !== docsRoot && !resolved.startsWith(docsRoot + path.sep)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return next();
    }
    res.setHeader("Content-Type", mimeFor(resolved));
    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.end();
      return;
    }
    fs.createReadStream(resolved).pipe(res);
  };

  return {
    name: "sdev-docs-plugin",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(docsMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(docsMiddleware);
    },
    closeBundle() {
      if (!fs.existsSync(docsRoot)) return;
      const destRoot = path.join(outDir, "documentation");
      fs.mkdirSync(destRoot, { recursive: true });
      const readme = path.join(docsRoot, "README.md");
      if (fs.existsSync(readme)) {
        fs.copyFileSync(readme, path.join(destRoot, "README.md"));
      }
      for (const entry of fs.readdirSync(docsRoot, { withFileTypes: true })) {
        if (entry.isDirectory() && /^\d{2}-/.test(entry.name)) {
          fs.cpSync(path.join(docsRoot, entry.name), path.join(destRoot, entry.name), {
            recursive: true,
          });
        }
      }
    },
  };
}

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
  plugins: [react(), sdevDocsPlugin(), mcpPlugin()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(cloudUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(cloudPublishableKey),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The MCP SDK treats Windows drive paths as npm packages. Resolve its
      // generated entry import from the project root before it can do that.
      ...(process.platform === "win32" && {
        [path.resolve(__dirname, "src/lib/mcp/index.ts")]: "./src/lib/mcp/index.ts",
      }),
    },
  },
  };
});
