// Generate the Open Graph images (public/og-*.png) in the site's zine style,
// using the REAL self-hosted fonts (Archivo Black + Space Mono) rather than
// SVG-rasterizer fallbacks. One default card plus an accent-themed card per
// section. Rendered headless via Playwright at 1200x630 @2x (2400x1260).
//
// Usage: node scripts/generate-og.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "/Users/davidgarwacke/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core",
);

const b64 = (p) => readFileSync(p).toString("base64");
const ARCHIVO = b64(
  "node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2",
);
const MONO = b64(
  "node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2",
);

const PAPER = "#faf3e7";
const INK = "#16121a";
const PINK = "#ff4d8d";
const PINK_DEEP = "#c91550";
const BLUE = "#0b63ce";
const YELLOW = "#ffd23f";

// accent = card frame; deep = kicker/est text on the paper panel.
const ACCENTS = {
  pink: { accent: PINK, deep: PINK_DEEP },
  blue: { accent: BLUE, deep: BLUE },
  yellow: { accent: YELLOW, deep: PINK_DEEP },
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
  const { accent, deep } = ACCENTS[v.color];
  const titleSize = v.title.length > 1 ? 112 : 150;
  const nbsp = (s) => s.replace(/ /g, "&nbsp;");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family:"Archivo Black"; src:url(data:font/woff2;base64,${ARCHIVO}) format("woff2"); font-weight:400; font-display:block; }
    @font-face { font-family:"Space Mono"; src:url(data:font/woff2;base64,${MONO}) format("woff2"); font-weight:700; font-display:block; }
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1200px;height:630px}
    body{background:${PAPER};background-image:repeating-linear-gradient(-45deg,transparent 0 13px,rgba(22,18,26,0.035) 13px 14px);display:flex;align-items:center;justify-content:center;font-synthesis:none}
    .card{width:1000px;transform:rotate(-2deg);background:${accent};border:8px solid ${INK};border-radius:12px;box-shadow:18px 18px 0 ${INK};padding:22px}
    .panel{background:${PAPER};border:4px solid ${INK};border-radius:5px;padding:50px 60px 46px}
    .kicker{font-family:"Archivo Black",sans-serif;font-size:40px;color:${deep};text-transform:uppercase;letter-spacing:0.01em;margin-bottom:14px}
    .title{font-family:"Archivo Black",sans-serif;font-size:${titleSize}px;line-height:0.9;letter-spacing:-0.02em;color:${INK};text-transform:uppercase}
    .est{font-family:"Archivo Black",sans-serif;font-size:46px;color:${deep};text-transform:uppercase;margin-top:18px}
    .tag{font-family:"Space Mono",monospace;font-weight:700;font-size:32px;color:${INK};text-transform:uppercase;letter-spacing:0.02em;margin-top:28px}
  </style></head><body>
    <div class="card"><div class="panel">
      ${v.kicker ? `<div class="kicker">${nbsp(v.kicker)}</div>` : ""}
      <div class="title">${v.title.map(nbsp).join("<br>")}</div>
      ${v.est ? `<div class="est">${nbsp(v.est)}</div>` : ""}
      <div class="tag">${nbsp(v.tag)}</div>
    </div></div>
  </body></html>`;
}

const browser = await chromium.launch();
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
