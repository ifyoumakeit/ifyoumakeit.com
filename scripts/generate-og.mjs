// Generate the Open Graph images (public/og-*.png) in the site's cinematic
// screening-room style, using the REAL self-hosted fonts (Anton + Space Mono)
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

const BLACK = "#0b0b0d";
const INK = "#f4f2ee";
const PINK = "#ff4d8d";
const BLUE = "#5aa7ff";
const YELLOW = "#ffd23f";
const MUTED = "#98939e";

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
  const titleSize = v.title.length > 1 ? 148 : 190;
  const nbsp = (s) => s.replace(/ /g, "&nbsp;");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family:"Anton"; src:url(data:font/woff2;base64,${ANTON}) format("woff2"); font-weight:400; font-display:block; }
    @font-face { font-family:"Space Mono"; src:url(data:font/woff2;base64,${MONO}) format("woff2"); font-weight:700; font-display:block; }
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1200px;height:630px}
    body{
      background:${BLACK};
      background-image:radial-gradient(ellipse 90% 55% at 50% -8%, rgba(244,242,238,0.07), transparent 70%);
      display:flex;align-items:center;font-synthesis:none}
    .card{padding:0 96px;width:100%}
    .rule{width:120px;height:8px;background:${accent};margin-bottom:34px}
    .kicker{font-family:"Space Mono",monospace;font-weight:700;font-size:30px;color:${accent};text-transform:uppercase;letter-spacing:0.3em;margin-bottom:20px}
    .title{font-family:"Anton",sans-serif;font-size:${titleSize}px;line-height:0.98;letter-spacing:0.01em;color:${INK};text-transform:uppercase}
    .est{font-family:"Anton",sans-serif;font-size:42px;color:${accent};text-transform:uppercase;letter-spacing:0.02em;margin-top:22px}
    .tag{font-family:"Space Mono",monospace;font-weight:700;font-size:28px;color:${MUTED};text-transform:uppercase;letter-spacing:0.08em;margin-top:32px}
  </style></head><body>
    <div class="card">
      <div class="rule"></div>
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
