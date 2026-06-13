#!/usr/bin/env node
/**
 * Backfill album.link (Odesli) smart links into db/data/albums.json.
 *
 * Usage:
 *   node scripts/update-songlinks.mjs --dry     # report only, write nothing
 *   node scripts/update-songlinks.mjs           # write confident matches
 *   node scripts/update-songlinks.mjs --refresh # also re-check albums that
 *                                                  already have a songlink_url
 *   node scripts/update-songlinks.mjs --limit 10 --delay 3000
 *
 * Why this exists: `songlink_url` is the one field the legacy dump never had,
 * so all ~110 albums need it filled in. Doing that by hand is miserable.
 *
 * How it works (no API key, no auth):
 *   1. Query the free iTunes Search API for "<artist> <title>" (entity=album).
 *   2. Fuzzy-match the best result on normalized artist AND title (Dice
 *      bigram coefficient) so we don't attach the wrong record.
 *   3. The matched result's `collectionId` is an Apple/iTunes album id, which
 *      album.link resolves directly — the same shape as the links already in
 *      the data (https://album.link/i/<id>). No Odesli call needed.
 *
 * Coverage is partial by nature: lots of DIY/punk records are Bandcamp-only
 * and aren't on Apple Music. Unmatched and low-confidence albums are left
 * untouched and listed so they can be handled by hand in the local admin.
 *
 * NETWORK: needs egress to itunes.apple.com. In a restricted/allowlisted
 * environment add that host first; locally it just works.
 *
 * Review the result with `git diff db/data/albums.json` before committing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DRY = process.argv.includes("--dry");
const REFRESH = process.argv.includes("--refresh");
const argVal = (flag, def) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const LIMIT = Number(argVal("--limit", "0")) || Infinity;
const DELAY = Number(argVal("--delay", "2500")); // iTunes ~20 req/min

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "db/data/albums.json");
const albums = JSON.parse(readFileSync(dataPath, "utf8"));

// Accept a match only when both the artist and the album title are clearly
// the same record. Tuned to be conservative — a miss is cheap (handled by
// hand), a wrong link is not.
const ARTIST_MIN = 0.72;
const TITLE_MIN = 0.6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lowercase, strip diacritics + punctuation + leading articles. */
function norm(s) {
  return (s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop store-page suffixes Apple adds to album titles. */
function stripAlbumSuffix(s) {
  return s.replace(/\s*[-–(]\s*(ep|single|deluxe|remaster|expanded)\b.*$/i, "");
}

const SELF_TITLED = /^(self[\s-]?titled|s\s*\/?\s*t|untitled)$/i;
const isSelfTitled = (a) => SELF_TITLED.test(a.title.trim());

/** Dice coefficient over character bigrams → 0..1 similarity. */
function dice(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  let total = 0;
  for (const [, n] of A) total += n;
  for (const [g, n] of B) {
    total += n;
    const have = A.get(g) ?? 0;
    if (have > 0) {
      inter += Math.min(have, n);
      A.set(g, have - 1);
    }
  }
  return (2 * inter) / total;
}

async function searchITunes(term) {
  const url =
    "https://itunes.apple.com/search?" +
    new URLSearchParams({
      term,
      entity: "album",
      media: "music",
      limit: "10",
      country: "US",
    });
  const res = await fetch(url, { headers: { "User-Agent": "iymi-songlinks" } });
  if (res.status === 403)
    throw new Error(
      "iTunes API blocked (403). In an allowlisted environment, add " +
        "itunes.apple.com to network egress; otherwise run locally.",
    );
  if (!res.ok) throw new Error(`iTunes API ${res.status}`);
  return (await res.json()).results ?? [];
}

/** Best candidate for one album, or null. */
function pickBest(album, results) {
  const selfTitled = isSelfTitled(album);
  const wantArtist = norm(album.artist_name);
  const wantTitle = selfTitled ? wantArtist : norm(album.title);
  let best = null;
  for (const r of results) {
    if (!r.collectionId) continue;
    const aScore = dice(wantArtist, norm(r.artistName));
    const tScore = dice(wantTitle, norm(stripAlbumSuffix(r.collectionName ?? "")));
    const score = aScore * 0.5 + tScore * 0.5;
    if (!best || score > best.score)
      best = { score, aScore, tScore, r };
  }
  return best;
}

// ------------------------------------------------------------------- run

const matched = [];
const uncertain = [];
const none = [];
let processed = 0;

for (const album of albums) {
  if (album.songlink_url && !REFRESH) continue;
  if (processed >= LIMIT) break;
  processed++;

  const selfTitled = isSelfTitled(album);
  const term = selfTitled
    ? album.artist_name
    : `${album.artist_name} ${album.title}`;

  let best;
  try {
    best = pickBest(album, await searchITunes(term));
  } catch (err) {
    console.error(`\n${err.message}`);
    process.exit(1);
  }

  const row = { album, best };
  if (best && best.aScore >= ARTIST_MIN && best.tScore >= TITLE_MIN) {
    matched.push(row);
  } else if (best && best.aScore >= 0.5) {
    uncertain.push(row);
  } else {
    none.push(row);
  }

  await sleep(DELAY);
}

// ------------------------------------------------------------------- report

const url = (b) => `https://album.link/i/${b.r.collectionId}`;
const pct = (n) => `${Math.round(n * 100)}%`.padStart(4);

console.log(`\nProcessed ${processed} album(s).\n`);
console.log(`✓ MATCHED (${matched.length}) — will be written:`);
for (const { album, best } of matched) {
  console.log(
    `  ${album.artist_name} — ${album.title}\n` +
      `     → ${best.r.artistName} — ${best.r.collectionName}  ` +
      `[artist ${pct(best.aScore)} / title ${pct(best.tScore)}]\n` +
      `     ${url(best)}`,
  );
}
if (uncertain.length) {
  console.log(`\n? UNCERTAIN (${uncertain.length}) — skipped, check by hand:`);
  for (const { album, best } of uncertain) {
    console.log(
      `  ${album.artist_name} — ${album.title}  ` +
        `→ ${best.r.artistName} — ${best.r.collectionName} ` +
        `[artist ${pct(best.aScore)} / title ${pct(best.tScore)}]  ${url(best)}`,
    );
  }
}
if (none.length) {
  console.log(`\n✗ NO MATCH (${none.length}) — likely not on Apple Music:`);
  for (const { album } of none)
    console.log(`  ${album.artist_name} — ${album.title}`);
}

if (DRY) {
  console.log("\ndry run — albums.json not written");
} else if (matched.length) {
  for (const { album, best } of matched) album.songlink_url = url(best);
  writeFileSync(dataPath, JSON.stringify(albums, null, 1) + "\n");
  console.log(
    `\nwrote db/data/albums.json (${matched.length} songlink_url set). ` +
      "Review with: git diff db/data/albums.json",
  );
} else {
  console.log("\nno confident matches — nothing written");
}
