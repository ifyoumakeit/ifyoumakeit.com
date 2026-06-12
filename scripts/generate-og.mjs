// Generate the default Open Graph image (public/og-default.png) in the site's
// zine style, using the REAL self-hosted fonts (Archivo Black + Space Mono)
// rather than SVG-rasterizer fallbacks (Arial Black / Courier New). Fonts are
// embedded as base64 data URIs and the card is rendered headless via Playwright
// at 1200x630, then screenshotted.
//
// Usage: node scripts/generate-og.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Reuse the npx-cached Playwright (same one the screenshot checks use).
const { chromium } = require(
  "/Users/davidgarwacke/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core",
);

const b64 = (path) => readFileSync(path).toString("base64");
const archivoBlack = b64(
  "node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2",
);
const spaceMono = b64(
  "node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2",
);

const PAPER = "#faf3e7";
const INK = "#16121a";
const PINK = "#ff4d8d";
const PINK_DEEP = "#c91550";

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face {
    font-family: "Archivo Black";
    src: url(data:font/woff2;base64,${archivoBlack}) format("woff2");
    font-weight: 400; font-display: block;
  }
  @font-face {
    font-family: "Space Mono";
    src: url(data:font/woff2;base64,${spaceMono}) format("woff2");
    font-weight: 700; font-display: block;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    background: ${PAPER};
    /* faint diagonal photocopy texture */
    background-image: repeating-linear-gradient(
      -45deg, transparent 0 13px, rgba(22,18,26,0.035) 13px 14px
    );
    display: flex; align-items: center; justify-content: center;
    font-synthesis: none;
  }
  .card {
    width: 1000px;
    transform: rotate(-2deg);
    background: ${PINK};
    border: 8px solid ${INK};
    border-radius: 12px;
    box-shadow: 18px 18px 0 ${INK};
    padding: 22px;
  }
  .panel {
    background: ${PAPER};
    border: 4px solid ${INK};
    border-radius: 5px;
    padding: 54px 60px 50px;
  }
  .title {
    font-family: "Archivo Black", sans-serif;
    font-size: 118px;
    line-height: 0.9;
    letter-spacing: -0.02em;
    color: ${INK};
    text-transform: uppercase;
  }
  .est {
    font-family: "Archivo Black", sans-serif;
    font-size: 46px;
    color: ${PINK_DEEP};
    text-transform: uppercase;
    letter-spacing: 0.01em;
    margin-top: 18px;
  }
  .tag {
    font-family: "Space Mono", monospace;
    font-weight: 700;
    font-size: 33px;
    color: ${INK};
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin-top: 30px;
  }
</style></head>
<body>
  <div class="card">
    <div class="panel">
      <div class="title">If&nbsp;You<br>Make&nbsp;It</div>
      <div class="est">Established 2007–2014</div>
      <div class="tag">Pink Couch Sessions · Live Music</div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2, // crisp 2400x1260 source, scaled by consumers
});
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const buf = await page.screenshot({ type: "png" });
await browser.close();

writeFileSync("public/og-default.png", buf);
console.log(`wrote public/og-default.png (${(buf.length / 1024).toFixed(0)} KB)`);
