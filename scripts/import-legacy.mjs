#!/usr/bin/env node
/**
 * One-time importer: legacy ifyoumakeit.com MySQL dump -> db/data/*.json
 *
 * Usage: node scripts/import-legacy.mjs path/to/iymi_db.sql
 *
 * Reads the legacy CMS tables (iymi_category, iymi_posts, iymi_postmeta)
 * and emits the JSON data files that src/lib/db.ts loads. The raw dump is NOT
 * committed to the repo (it contains user emails in unrelated tables); only
 * the generated content files are.
 *
 * Legacy shape: post_title = artist/band name, post_subtitle = song title,
 * postmeta video_server = y(outube) | v(imeo) | d(ailymotion) | 0 (self-
 * hosted flash/mp4 file), postmeta video_file = provider id or filename.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error("usage: node scripts/import-legacy.mjs path/to/iymi_db.sql");
  process.exit(1);
}
const src = readFileSync(dumpPath, "utf8");

// ---------------------------------------------------------------- parsing

function getInsertValues(table) {
  const m = src.match(
    new RegExp("INSERT INTO `" + table + "`[^]*?VALUES\\s*([^]*?);\\n")
  );
  if (!m) throw new Error(`no INSERT found for ${table}`);
  return m[1];
}

const MYSQL_ESCAPES = {
  "0": "\0",
  "'": "'",
  '"': '"',
  b: "\b",
  n: "\n",
  r: "\r",
  t: "\t",
  Z: "\x1a",
  "\\": "\\",
  "%": "%",
  _: "_",
};

/** Parse the (...),(...),... value list of a MySQL INSERT into string rows. */
function parseTuples(s) {
  const rows = [];
  let row = [];
  let cur = "";
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") {
        cur += MYSQL_ESCAPES[s[i + 1]] ?? s[i + 1];
        i++;
      } else if (c === "'") {
        if (s[i + 1] === "'") {
          cur += "'";
          i++;
        } else {
          inStr = false;
        }
      } else {
        cur += c;
      }
      continue;
    }
    if (c === "'") inStr = true;
    else if (c === "(") {
      row = [];
      cur = "";
    } else if (c === "," || c === ")") {
      row.push(cur.trim());
      cur = "";
      if (c === ")") rows.push(row);
    } else cur += c;
  }
  return rows;
}

const ENTITIES = {
  "&amp;": "&",
  "&quot;": '"',
  "&#039;": "'",
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};
function decodeEntities(s) {
  return s
    .replace(/&(amp|quot|#0?39|lt|gt|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function cleanSlug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Wrap plain-text paragraphs of a legacy HTML body in <p> tags. */
function toHtml(body) {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\r?\n\s*\r?\n/)
    .map((p) => `<p>${p.replace(/\r?\n/g, "<br />").trim()}</p>`)
    .join("\n");
}

// ----------------------------------------------------------------- series

// The legacy categories that hold videos, with the new design accents.
// The legacy "Music Videos" category (legacyId 7) is intentionally excluded —
// it isn't IYMI-produced content; its posts are skipped at import (no series).
const SERIES = [
  {
    legacyId: 1,
    id: 1,
    title: "Live",
    slug: "live",
    color: "#2D7DFF",
    sort: 2,
    description:
      "Live and direct: bands captured on stage and on floors — basements, bars, fests, and living rooms, mostly around New York and beyond.",
  },
  {
    legacyId: 2,
    id: 2,
    title: "Sessions",
    slug: "sessions",
    color: "#FF4D8D",
    sort: 1,
    description:
      "One band, one song, one take. Acoustic sessions filmed wherever the couch was — including the famous Pink Couch Sessions.",
  },
  {
    legacyId: 3,
    id: 3,
    title: "Series",
    slug: "series",
    color: "#FFD23F",
    sort: 3,
    description:
      "Multi-part features, documentaries, and ongoing video series from the DIY punk world.",
  },
];
const seriesByLegacy = new Map(SERIES.map((s) => [s.legacyId, s]));

// ------------------------------------------------------------------ posts

// iymi_posts columns: post_id, post_body, post_category, post_publish,
// post_date, post_title, post_title_slug, post_subtitle, post_subtitle_slug,
// comment_count, post_views, post_link, post_user, post_bgcolor, post_excerpt
const posts = parseTuples(getInsertValues("iymi_posts"));

// iymi_postmeta columns: meta_id, meta_name, meta_value, post_id
const meta = parseTuples(getInsertValues("iymi_postmeta"));
const videoFile = new Map();
const videoServer = new Map();
let featuredPostId = null;
for (const [, name, value, postId] of meta) {
  if (name === "video_file") videoFile.set(postId, value.trim());
  if (name === "video_server") videoServer.set(postId, value.trim());
  if (name === "featured_post") featuredPostId = value.trim() || postId;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
function resolveProvider(postId) {
  const file = videoFile.get(postId) ?? "";
  const server = videoServer.get(postId) ?? "";
  if (server === "y" && file) return { provider: "youtube", id: file };
  if (server === "v" && /^\d+$/.test(file)) return { provider: "vimeo", id: file };
  if (server === "d" && file) return { provider: "dailymotion", id: file };
  // data-entry quirks: sometimes the youtube id landed in both columns
  if (YT_ID.test(file)) return { provider: "youtube", id: file };
  if (/\.(flv|mp4|mov)$/i.test(file)) return { provider: "flash", id: file };
  return null;
}

// ----------------------------------------------------------------- import

const artists = [];
const artistByKey = new Map(); // normalized name -> artist record
const artistNameVotes = new Map(); // key -> Map(variant -> count)
const usedArtistSlugs = new Set();
const videos = [];
const usedVideoSlugs = new Set(); // per `${seriesId}/${slug}`
const skipped = [];

for (const p of posts) {
  const [
    postId, body, categoryId, publish, date, rawTitle, titleSlug,
    rawSubtitle, subtitleSlug, , views,
  ] = p;
  const series = seriesByLegacy.get(Number(categoryId));
  if (!series) continue; // non-video category (albums, comics, articles, …)
  if (publish !== "1") continue;

  const artistName = decodeEntities(rawTitle).trim();
  const resolved = resolveProvider(postId);
  if (!artistName || !resolved) {
    skipped.push({ postId, artistName, file: videoFile.get(postId) });
    continue;
  }

  const key = artistName.toLowerCase();
  if (!artistByKey.has(key)) {
    let slug = cleanSlug(titleSlug) || cleanSlug(artistName) || `artist-${postId}`;
    while (usedArtistSlugs.has(slug)) slug += "-2";
    usedArtistSlugs.add(slug);
    const record = { id: artists.length + 1, name: artistName, slug };
    artists.push(record);
    artistByKey.set(key, record);
    artistNameVotes.set(key, new Map());
  }
  const votes = artistNameVotes.get(key);
  votes.set(artistName, (votes.get(artistName) ?? 0) + 1);

  const title = decodeEntities(rawSubtitle).trim() || "Untitled";
  let slug =
    [cleanSlug(titleSlug), cleanSlug(subtitleSlug)].filter(Boolean).join("-") ||
    `video-${postId}`;
  while (usedVideoSlugs.has(`${series.id}/${slug}`)) slug += "-2";
  usedVideoSlugs.add(`${series.id}/${slug}`);

  videos.push({
    id: Number(postId),
    title,
    slug,
    artist_id: artistByKey.get(key).id,
    series_id: series.id,
    description: toHtml(body),
    recorded_at: date,
    provider: resolved.provider,
    provider_id: resolved.id,
    featured: postId === featuredPostId ? 1 : 0,
    views: Number(views) || 0,
  });
}

// Pick the most common spelling of each artist name.
for (const [key, votes] of artistNameVotes) {
  const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  artistByKey.get(key).name = best;
}

// Guarantee a featured video for the home hero: fall back to the most watched.
if (!videos.some((v) => v.featured === 1) && videos.length) {
  videos.reduce((a, b) => (b.views > a.views ? b : a)).featured = 1;
}

// ------------------------------------------------------------------ write

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "data");
mkdirSync(outDir, { recursive: true });
const write = (name, data) =>
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 1) + "\n");
write("series.json", SERIES.map(({ legacyId, ...s }) => s));
write("artists.json", artists);
write("videos.json", videos);

const byProvider = videos.reduce((acc, v) => {
  acc[v.provider] = (acc[v.provider] ?? 0) + 1;
  return acc;
}, {});
console.log(`series:  ${SERIES.length}`);
console.log(`artists: ${artists.length}`);
console.log(`videos:  ${videos.length}`, byProvider);
console.log(`views:   ${videos.reduce((n, v) => n + v.views, 0).toLocaleString()}`);
console.log(`skipped: ${skipped.length}`);
for (const s of skipped) console.log("  -", s.postId, s.artistName, s.file ?? "(no video meta)");
