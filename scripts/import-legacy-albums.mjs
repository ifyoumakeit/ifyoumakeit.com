#!/usr/bin/env node
/**
 * Legacy importer: album posts -> db/data/albums.json
 *
 * Usage: node scripts/import-legacy-albums.mjs path/to/iymi_db.sql
 *
 * Reads the legacy `Albums` category (post_category = 4) plus its
 * `iymi_postmeta` (album_members / album_tracklist / album_purchase /
 * album_donation_amount) and `iymi_downloads` (per-file counts), and emits the
 * JSON that src/lib/db.ts loads. The raw dump is NOT committed (it contains
 * personal emails). The `album_donation` meta field is a band contact email and
 * is intentionally NOT imported. The song.link / album.link (Odesli) smart link
 * isn't in the legacy data and starts null — fill it in via /admin.
 *
 * Legacy shape: post_title = artist/band/label, post_subtitle = album title.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error("usage: node scripts/import-legacy-albums.mjs path/to/iymi_db.sql");
  process.exit(1);
}
const src = readFileSync(dumpPath, "utf8");

const ALBUMS_CATEGORY = "4";

// ---------------------------------------------------------------- parsing
// (same MySQL-dump parsing as scripts/import-legacy.mjs)

function getInsertValues(table) {
  const m = src.match(
    new RegExp("INSERT INTO `" + table + "`[^]*?VALUES\\s*([^]*?);\\n"),
  );
  if (!m) throw new Error(`no INSERT found for ${table}`);
  return m[1];
}

const MYSQL_ESCAPES = {
  "0": "\0", "'": "'", '"': '"', b: "\b", n: "\n",
  r: "\r", t: "\t", Z: "\x1a", "\\": "\\", "%": "%", _: "_",
};

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
        } else inStr = false;
      } else cur += c;
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
  "&amp;": "&", "&quot;": '"', "&#039;": "'", "&#39;": "'",
  "&lt;": "<", "&gt;": ">", "&nbsp;": " ",
};
function decodeEntities(s) {
  return s
    .replace(/&(amp|quot|#0?39|lt|gt|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function cleanSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toHtml(body) {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\r?\n\s*\r?\n/)
    .map((p) => `<p>${p.replace(/\r?\n/g, "<br />").trim()}</p>`)
    .join("\n");
}

// Defensive privacy scrub: band/booking emails sometimes appear inline in a
// post body. Drop them (and the <br> that usually precedes them) so no email
// reaches the committed data.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
function stripEmails(s) {
  if (!s) return s;
  return s
    .replace(/\s*<br\s*\/?>\s*/gi, " ")
    .replace(EMAIL_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Parse a legacy tracklist blob into a list of track titles. Numbering, the
    old "*" sample-track marker, and side/section markers are stripped. */
function parseTracklist(raw) {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) =>
      decodeEntities(
        line
          .replace(/^\s*\d+\s*[.)]\s*/, "") // leading "1." / "1)"
          .replace(/\*/g, "")
          .trim(),
      ),
    )
    .filter(Boolean);
}

// ------------------------------------------------------------------ data

const posts = parseTuples(getInsertValues("iymi_posts"));

// meta_id, meta_name, meta_value, post_id
const meta = parseTuples(getInsertValues("iymi_postmeta"));
const members = new Map();
const tracklists = new Map();
const purchase = new Map();
const donation = new Map();
for (const [, name, value, postId] of meta) {
  if (name === "album_members") members.set(postId, value);
  else if (name === "album_tracklist") tracklists.set(postId, value);
  else if (name === "album_purchase") purchase.set(postId, value.trim());
  else if (name === "album_donation_amount") donation.set(postId, value.trim());
  // album_donation is a personal email — intentionally not imported.
}

// download_id, download_count, download_title, download_post_id — sum per post
const downloads = new Map();
for (const row of parseTuples(getInsertValues("iymi_downloads"))) {
  const count = Number(row[1]) || 0;
  const postId = row[3];
  downloads.set(postId, (downloads.get(postId) ?? 0) + count);
}

// ------------------------------------------------------------------ build

const albums = [];
const usedSlugs = new Set();

for (const p of posts) {
  const [postId, body, categoryId, publish, date, rawTitle, titleSlug, rawSubtitle, subtitleSlug] = p;
  if (categoryId !== ALBUMS_CATEGORY || publish !== "1") continue;

  const artistName = decodeEntities(rawTitle).trim();
  const title = decodeEntities(rawSubtitle).trim() || "Untitled";
  if (!artistName) continue;

  let slug =
    [cleanSlug(titleSlug), cleanSlug(subtitleSlug)].filter(Boolean).join("-") ||
    cleanSlug(`${artistName} ${title}`) ||
    `album-${postId}`;
  while (usedSlugs.has(slug)) slug += "-2";
  usedSlugs.add(slug);

  const memberStr = decodeEntities(members.get(postId) ?? "").trim();
  const amount = donation.get(postId);

  albums.push({
    id: Number(postId),
    title,
    slug,
    artist_name: artistName,
    artist_slug: cleanSlug(titleSlug) || cleanSlug(artistName),
    description: stripEmails(toHtml(body)),
    members: stripEmails(memberStr) || null,
    tracklist: parseTracklist(tracklists.get(postId)),
    released_at: date,
    downloads: downloads.get(postId) ?? 0,
    donation_amount: amount || null,
    songlink_url: null, // song.link smart link, added later via /admin
    purchase_url: purchase.get(postId) || null,
    publish: 1,
  });
}

albums.sort((a, b) => b.released_at.localeCompare(a.released_at));

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "data");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "albums.json"), JSON.stringify(albums, null, 1) + "\n");

const totalDownloads = albums.reduce((n, a) => n + a.downloads, 0);
console.log(`albums:    ${albums.length}`);
console.log(`with buy:  ${albums.filter((a) => a.purchase_url).length}`);
console.log(`downloads: ${totalDownloads.toLocaleString()} (lifetime, legacy site)`);
