// Generate the Open Graph images (public/og-*.png) in the site's dark
// gig-poster style, using the REAL self-hosted fonts (Anton + Space Mono)
// rather than SVG-rasterizer fallbacks. One default card plus an
// accent-themed card per section. Rendered headless via Playwright at
// 1200x630 @2x (2400x1260).
//
// Usage: node scripts/generate-og.mjs
// Needs playwright-core (devDependency). Chromium resolution order:
//   1. $OG_CHROMIUM  2. playwright-core's own resolution
//   3. /opt/pw-browsers/chromium (preinstalled path in CI containers)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const b64 = (p) => readFileSync(p).toString("base64");
const ANTON = b64(
  "node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2",
);
const MONO = b64(
  "node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2",
);

const PAPER = "#16121b";
const PANEL = "#201a29";
const INK = "#f4ecdc";
const PINK = "#ff4d8d";
const BLUE = "#4da3ff";
const YELLOW = "#ffd23f";
const MUTED = "#a99db5";

const ACCENTS = {
  pink: PINK,
  blue: BLUE,
  yellow: YELLOW,
};

const VARIANTS = [
  { slug: "default", color: "pink", title: ["If You", "Make It"], est: "Established 2007–2014", tag: "Pink Couch Sessions · Live Music" },
  { slug: "sessions", color: "pink", kicker: "If You Make It", title: ["Pink Couch", "Sessions"], tag: "One band · one song · one take" },
  { slug: "live", color: "blue", kicker: "If You Make It", title: ["Live &", "Direct"], tag: "On stages, floors & basements" },
  { slug: "series", color: "yellow", kicker: "If You Make It", title: ["Series"], tag: "Features · docs · video series" },
  { slug: "albums", color: "blue", kicker: "If You Make It", title: ["Albums"], tag: "The free download archive" },
  { slug: "comics", color: "yellow", kicker: "If You Make It", title: ["Comics"], tag: "Punk strips by guest cartoonists" },
  { slug: "artists", color: "pink", kicker: "If You Make It", title: ["Artists"], tag: "Every band in the archive" },
  { slug: "years", color: "blue", kicker: "If You Make It", title: ["Years"], tag: "The whole archive, by year" },
];

function cardHtml(v) {
  const accent = ACCENTS[v.color];
  const titleSize = v.title.length > 1 ? 118 : 158;
  const nbsp = (s) => s.replace(/ /g, "&nbsp;");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family:"Anton"; src:url(data:font/woff2;base64,${ANTON}) format("woff2"); font-weight:400; font-display:block; }
    @font-face { font-family:"Space Mono"; src:url(data:font/woff2;base64,${MONO}) format("woff2"); font-weight:700; font-display:block; }
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1200px;height:630px}
    body{
      background:${PAPER};
      background-image:
        radial-gradient(ellipse at 18% 6%, rgba(255,77,141,0.1) 0, transparent 45%),
        radial-gradient(ellipse at 85% 85%, rgba(77,163,255,0.08) 0, transparent 48%),
        radial-gradient(circle, rgba(244,236,220,0.05) 1.5px, transparent 2.2px);
      background-size:auto,auto,26px 26px;
      display:flex;align-items:center;justify-content:center;font-synthesis:none}
    .card{width:1020px;background:${PANEL};border:9px solid ${INK};border-radius:3px;box-shadow:22px 22px 0 ${accent};padding:56px 64px 52px}
    .kicker{font-family:"Space Mono",monospace;font-weight:700;font-size:34px;color:${accent};text-transform:uppercase;letter-spacing:0.14em;margin-bottom:18px}
    .title{font-family:"Anton",sans-serif;font-size:${titleSize}px;line-height:0.98;letter-spacing:0.01em;color:${INK};text-transform:uppercase;text-shadow:6px 6px 0 ${accent}99}
    .est{font-family:"Anton",sans-serif;font-size:44px;color:${accent};text-transform:uppercase;letter-spacing:0.02em;margin-top:20px}
    .tag{font-family:"Space Mono",monospace;font-weight:700;font-size:30px;color:${MUTED};text-transform:uppercase;letter-spacing:0.04em;margin-top:30px}
  </style></head><body>
    <div class="card">
      ${v.kicker ? `<div class="kicker">${nbsp(v.kicker)}</div>` : ""}
      <div class="title">${v.title.map(nbsp).join("<br>")}</div>
      ${v.est ? `<div class="est">${nbsp(v.est)}</div>` : ""}
      <div class="tag">${nbsp(v.tag)}</div>
    </div>
  </body></html>`;
}

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
for (const v of VARIANTS) {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  await page.setContent(cardHtml(v), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: "png" });
  await page.close();
  const file = `public/og-${v.slug}.png`;
  writeFileSync(file, buf);
  console.log(`wrote ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
}
await browser.close();
