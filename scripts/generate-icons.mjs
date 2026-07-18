// Generate the app icons (public/icon-*.png, public/apple-touch-icon.png)
// in the site's TV-glow style: neon pink couch on the violet-black house
// with a soft orchid bloom. Rendered headless via Playwright.
//
// Usage: node scripts/generate-icons.mjs
// Needs playwright-core (devDependency). Chromium resolution order:
//   1. $OG_CHROMIUM  2. playwright-core's own resolution
//   3. /opt/pw-browsers/chromium (preinstalled path in CI containers)
import { existsSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const BLACK = "#0d0a13";
const PINK = "#ff4d8d";
const PINK_DEEP = "#c91550";

// couchScale: fraction of the tile the couch spans. Maskable icons keep
// artwork inside the ~80% safe zone so launchers can crop to any shape.
function iconHtml(size, couchScale) {
  const couch = size * couchScale;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}
    html,body{width:${size}px;height:${size}px}
    body{
      background:${BLACK};
      background-image:radial-gradient(circle at 50% 42%,
        rgba(215,136,232,0.28), rgba(167,139,250,0.10) 55%, transparent 78%);
      display:grid;place-items:center}
    svg{width:${couch}px;height:auto;
      filter:drop-shadow(0 0 ${size * 0.045}px rgba(255,77,141,0.85))
             drop-shadow(0 0 ${size * 0.12}px rgba(255,77,141,0.45))}
  </style></head><body>
    <svg viewBox="0 0 64 40">
      <g stroke="${PINK}" stroke-width="3.4" fill="${BLACK}"
         stroke-linejoin="round" stroke-linecap="round">
        <rect x="10" y="6" width="44" height="14" rx="6"></rect>
        <rect x="8" y="17" width="48" height="13" rx="5"></rect>
        <line x1="32" y1="19" x2="32" y2="28" stroke="${PINK_DEEP}"></line>
        <rect x="6" y="13" width="10" height="17" rx="4"></rect>
        <rect x="48" y="13" width="10" height="17" rx="4"></rect>
        <line x1="14" y1="30" x2="14" y2="36"></line>
        <line x1="50" y1="30" x2="50" y2="36"></line>
      </g>
    </svg>
  </body></html>`;
}

const ICONS = [
  { file: "public/icon-192.png", size: 192, couchScale: 0.68 },
  { file: "public/icon-512.png", size: 512, couchScale: 0.68 },
  // Maskable: artwork within the safe zone for round/squircle crops.
  { file: "public/icon-maskable-512.png", size: 512, couchScale: 0.52 },
  { file: "public/apple-touch-icon.png", size: 180, couchScale: 0.66 },
];

async function launch() {
  const candidates = [process.env.OG_CHROMIUM, undefined, "/opt/pw-browsers/chromium"];
  let lastErr;
  for (const executablePath of candidates) {
    if (executablePath && !existsSync(executablePath)) continue;
    try {
      return await chromium.launch(executablePath ? { executablePath } : {});
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

const browser = await launch();
for (const { file, size, couchScale } of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(iconHtml(size, couchScale), { waitUntil: "load" });
  const buf = await page.screenshot({ type: "png" });
  await page.close();
  writeFileSync(file, buf);
  console.log(`wrote ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
}
await browser.close();
