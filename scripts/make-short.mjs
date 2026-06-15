#!/usr/bin/env node
/**
 * Turn a horizontal archive clip into a vertical YouTube Short (1080x1920).
 * The video sits centered on a solid paper background; the blank bands above and
 * below carry branding rendered in the real site fonts:
 *
 *     IFYOUMAKEIT · BAND · Song · <series>
 *                 [ video ]
 *     SEE MORE / @ifyoumakeit / ifyoumakeit.com
 *
 * This ffmpeg build has no drawtext (no libfreetype), and Archivo Black ships
 * only as woff2, so the text is rendered to a transparent PNG via headless
 * Chromium (real fonts), then composited with ffmpeg overlay. The overlay is
 * cached per label, so batching many clips only renders it once.
 *
 * Usage:
 *   node scripts/make-short.mjs <input> [options]
 * Options:
 *   --start, -s <t>   start time (45 | 0:45 | 1:02:03). default 0
 *   --dur,   -t <t>   clip length. default: to end
 *   --end,   -e <t>   end time (instead of --dur)
 *   --id       <v>    fill band/song/series from the archive (video id|slug|provider_id)
 *   --band     <txt>  band name (overrides --id)
 *   --song     <txt>  song title (overrides --id)
 *   --label    <txt>  series line. default from --id, else "PINK COUCH SESSIONS"
 *   --out,   -o <f>   output. default <dir>/shorts/<name>-short.mp4
 *   --crf      <n>    quality (lower=better). default 18
 *   --caption         also print a ready-to-paste YouTube description
 *   --refresh-overlay re-render the cached text PNG
 *   --dry             print the ffmpeg command and exit (with --caption, just the text)
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const REFRESH = args.includes("--refresh-overlay");
const CAPTION = args.includes("--caption");
const flag = (names, def) => {
  for (const n of names) {
    const i = args.indexOf(n);
    if (i >= 0 && args[i + 1]) return args[i + 1];
  }
  return def;
};

const input = args.find(
  (a) => !a.startsWith("-") && /\.(mp4|mov|mkv|webm|flv|m4v|avi)$/i.test(a),
);
if (!input || !existsSync(input)) {
  console.error("usage: node scripts/make-short.mjs <input> [-s 0:45] [-t 30] [--label 'PINK COUCH SESSIONS']");
  process.exit(1);
}

const start = flag(["--start", "-s"], "0");
const dur = flag(["--dur", "-t"], null);
const end = flag(["--end", "-e"], null);
const crf = flag(["--crf"], "18");

const root = join(dirname(new URL(import.meta.url).pathname), "..");
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

// Branding text. --band/--song/--label win; otherwise --id fills them from the
// archive, matching a video by numeric id, slug, or provider_id.
let band = flag(["--band", "--artist"], null);
let song = flag(["--song", "--title"], null);
let label = flag(["--label"], null);
let year = null;
let fullUrl = "https://ifyoumakeit.com";

const idArg = flag(["--id", "--video"], null);
if (idArg) {
  const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
  const v = load("db/data/videos.json").find(
    (x) => String(x.id) === idArg || x.provider_id === idArg || x.slug === idArg,
  );
  if (!v) {
    console.error(`no video matching --id ${idArg} (tried numeric id, slug, provider_id)`);
    process.exit(1);
  }
  const artist = load("db/data/artists.json").find((a) => a.id === v.artist_id);
  const ser = load("db/data/series.json").find((s) => s.id === v.series_id);
  band ??= artist?.name ?? null;
  song ??= v.title;
  label ??= ser?.title ?? null;
  year = new Date(v.recorded_at).getUTCFullYear();
  if (artist) {
    const songSlug = v.slug.startsWith(`${artist.slug}-`)
      ? v.slug.slice(artist.slug.length + 1)
      : v.slug;
    fullUrl = `https://ifyoumakeit.com/video/${artist.slug}/${songSlug}/`;
  }
}
const seriesText = label ?? "Pink Couch Sessions";
label = seriesText.toUpperCase();

// Ready-to-paste YouTube description (printed with --caption). First line is the
// SEO hook; first hashtags surface above the title.
const hashtag = (s) => "#" + s.replace(/[^A-Za-z0-9]+/g, "");
const caption =
  `${band ?? "If You Make It"}${song ? ` – "${song}"` : ""} | ${seriesText}${year ? ` (${year})` : ""}\n\n` +
  "From If You Make It, a DIY punk video archive. Watch the full session and hundreds more:\n" +
  `▶ Full video: ${fullUrl}\n` +
  "🌐 ifyoumakeit.com\n" +
  "📺 @ifyoumakeit\n\n" +
  `#Shorts #punk ${hashtag(band ?? "ifyoumakeit")} ${hashtag(seriesText)} #DIY`;
const printCaption = () =>
  console.log(
    `\n──────── YouTube description ────────\n${caption}\n─────────────────────────────────────`,
  );

const toSeconds = (t) => String(t).split(":").reduce((a, n) => a * 60 + Number(n), 0);
let durArg = dur;
if (end != null) durArg = String(toSeconds(end) - toSeconds(start));
if (durArg != null && toSeconds(durArg) > 180)
  console.warn(`note: ${durArg}s is over the 3-minute Shorts limit.`);

const outPath =
  flag(["--out", "-o"], null) ??
  join(dirname(input), "shorts", `${basename(input, extname(input))}-short.mp4`);
mkdirSync(dirname(outPath), { recursive: true });

// --- brand overlay (transparent PNG, rendered once per design) ------------
// Everything sits on a black canvas so the type never competes with the video;
// the overlay PNG is transparent over the bands and over the video center.
const BG = "16121A"; // ffmpeg pad color (no 0x here; added below)
const b64 = (p) => readFileSync(join(root, p)).toString("base64");

async function renderOverlay(labelText, bandName, songName) {
  const archivo = b64("node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2");
  const mono = b64("node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:"Archivo Black";src:url(data:font/woff2;base64,${archivo}) format("woff2");font-weight:400}
    @font-face{font-family:"Space Mono";src:url(data:font/woff2;base64,${mono}) format("woff2");font-weight:700}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1080px;height:1920px;background:transparent;font-synthesis:none}
    .band{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 50px}
    .top{top:0;height:656px;gap:14px}
    .bottom{bottom:0;height:656px;gap:10px}
    .brand{font-family:"Archivo Black";font-size:52px;line-height:.9;color:#FF4D8D;text-transform:uppercase;letter-spacing:.01em}
    .brand.solo{font-size:104px;letter-spacing:-.02em}
    .act{font-family:"Archivo Black";font-size:90px;line-height:.9;color:#FAF3E7;text-transform:uppercase;letter-spacing:-.02em;max-width:980px}
    .song{font-family:"Archivo Black";font-size:44px;line-height:1.02;color:#FAF3E7;text-transform:uppercase;max-width:940px}
    .label{font-family:"Space Mono";font-weight:700;font-size:27px;color:#FF4D8D;opacity:1;text-transform:uppercase;letter-spacing:.14em}
    .cta-lead{font-family:"Archivo Black";font-size:64px;line-height:.95;color:#FAF3E7;text-transform:uppercase;letter-spacing:-.01em}
    .cta{font-family:"Space Mono";font-weight:700;font-size:42px;color:#FAF3E7;text-transform:uppercase;letter-spacing:.02em}
    .at{color:#FF4D8D}
  </style></head><body>
    <div class="band top">
      <div class="label">${esc(labelText)}</div>
      ${bandName ? `<div class="act">${esc(bandName)}</div>` : ""}
      ${songName ? `<div class="song">${esc(songName)}</div>` : ""}
    </div>
    <div class="band bottom"><div class="cta-lead">SEE MORE</div><div class="cta">@ifyoumakeit</div><div class="cta">ifyoumakeit.com</div></div>
  </body></html>`;

  // Cache by a hash of the rendered HTML, so any design or label change makes a
  // fresh PNG instead of reusing a stale one.
  const hash = createHash("sha1").update(html).digest("hex").slice(0, 10);
  const out = join(tmpdir(), `iymi-short-overlay-${hash}.png`);
  if (existsSync(out) && !REFRESH) return out;

  const require = createRequire(import.meta.url);
  const { chromium } = require("/Users/davidgarwacke/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, omitBackground: true }); // transparent PNG
  await browser.close();
  return out;
}

const overlay = await renderOverlay(label, band, song);

// --- compose ---------------------------------------------------------------
// Pad the (aspect-preserved) video onto a paper canvas, then lay the
// transparent text PNG over the blank bands.
const filter =
  "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos,setsar=1," +
  `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x${BG}[base];` +
  "[base][1:v]overlay=0:0[v]";

const ff = [
  "-hide_banner", "-y",
  ...(start !== "0" ? ["-ss", start] : []),
  "-i", input,
  "-loop", "1", "-i", overlay,
  "-filter_complex", filter,
  "-map", "[v]", "-map", "0:a?",
  ...(durArg != null ? ["-t", durArg] : []),
  "-shortest",
  "-c:v", "libx264", "-preset", "medium", "-crf", crf, "-pix_fmt", "yuv420p", "-r", "30",
  "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
  "-movflags", "+faststart",
  outPath,
];

if (DRY) {
  console.log("overlay:", overlay);
  console.log("ffmpeg " + ff.map((a) => (/\s/.test(a) ? `'${a}'` : a)).join(" "));
  if (CAPTION) printCaption();
  process.exit(0);
}

console.log(`Short: ${input}  ->  ${outPath}`);
console.log(
  `  ${band ?? "IYMI"}${song ? ` — ${song}` : ""} · ${label}\n` +
    `  start ${start}${durArg != null ? `, ${durArg}s` : ", to end"}\n`,
);
const res = spawnSync("ffmpeg", ff, { stdio: "inherit" });
if (res.status !== 0) {
  console.error("\nffmpeg failed.");
  process.exit(res.status ?? 1);
}
console.log(`\nwrote ${outPath}`);
if (CAPTION) printCaption();
