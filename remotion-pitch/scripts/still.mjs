import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frame = Number(process.argv[2] ?? 60);
const out = process.argv[3] ?? `/tmp/frame-${frame}.png`;

const bundled = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), webpackOverride: (c) => c });
const browser = await openBrowser("chrome", {
  browserExecutable: "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});
const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });
await renderStill({ composition, serveUrl: bundled, output: out, frame, puppeteerInstance: browser });
await browser.close({ silent: false });
console.log("wrote", out);
