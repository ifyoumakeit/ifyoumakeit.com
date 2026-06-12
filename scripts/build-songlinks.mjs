#!/usr/bin/env node
/**
 * Fill album `songlink_url` via the Odesli (song.link) API.
 *
 * Usage:
 *   node scripts/build-songlinks.mjs           # fill missing links
 *   node scripts/build-songlinks.mjs --dry     # preview, write nothing
 *
 * Odesli is a RESOLVER, not a search engine: it turns ONE existing platform URL
 * (Spotify / Apple Music / Bandcamp / YouTube / Deezer / Tidal / SoundCloud …)
 * into a single song.link page plus every other platform. It cannot look an
 * album up by name, so each album needs a seed URL. This script uses, in order:
 *   1. album.seed_url   (add this field to albums.json for the ones you want)
 *   2. album.purchase_url, only if it's already a supported platform
 * Label storefronts (e.g. salinasrecords.com) are not supported and are skipped.
 *
 * Idempotent: albums that already have a songlink_url are left alone. Honors
 * Odesli's free-tier rate limit (~10 req/min) with a delay between calls.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DRY = process.argv.includes("--dry");
const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "data", "albums.json");
const ENDPOINT = "https://api.song.link/v1-alpha.1/links";
const DELAY_MS = 7000; // ~8/min, under the ~10/min free limit
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hosts Odesli can resolve. A seed must come from one of these.
const SUPPORTED = [
  "open.spotify.com", "spotify.com", "music.apple.com", "itunes.apple.com",
  "bandcamp.com", "youtube.com", "youtu.be", "music.youtube.com",
  "deezer.com", "tidal.com", "soundcloud.com", "pandora.com",
];
function isSupported(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return SUPPORTED.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

const albums = JSON.parse(readFileSync(DATA, "utf8"));
let filled = 0;
let skipped = 0;
const failures = [];

for (const a of albums) {
  if (a.songlink_url) continue; // idempotent
  const seed = a.seed_url || (isSupported(a.purchase_url) ? a.purchase_url : null);
  if (!seed) {
    skipped++;
    continue;
  }

  const url = `${ENDPOINT}?url=${encodeURIComponent(seed)}&userCountry=US`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.pageUrl) throw new Error("no pageUrl in response");
    console.log(`${DRY ? "[dry] " : ""}${a.artist_name} — ${a.title}\n      ${data.pageUrl}`);
    if (!DRY) a.songlink_url = data.pageUrl;
    filled++;
  } catch (err) {
    failures.push({ album: `${a.artist_name} — ${a.title}`, seed, error: String(err.message ?? err) });
  }
  await sleep(DELAY_MS);
}

if (!DRY && filled) {
  writeFileSync(DATA, JSON.stringify(albums, null, 1) + "\n");
}

console.log(`\nfilled:   ${filled}${DRY ? " (dry run, not written)" : ""}`);
console.log(`no seed:  ${skipped}`);
console.log(`failed:   ${failures.length}`);
for (const f of failures) console.log(`  - ${f.album}: ${f.error} (${f.seed})`);
