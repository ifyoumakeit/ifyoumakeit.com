// Build db/data/comics.json from the committed comic art in
// public/thumbs/comic/. The legacy dump (real titles/dates/descriptions) isn't
// on disk, so this derives a clean catalog from the filenames: artist from the
// known-creator prefix, title from the remainder, and multi-page strips grouped
// by panel numbering. A future dump importer can enrich these in place by slug.
//
// Usage: node scripts/derive-comics.mjs [--dry]
import { readdirSync, writeFileSync } from "node:fs";

const DRY = process.argv.includes("--dry");
const DIR = new URL("../public/thumbs/comic/", import.meta.url);

// Known comic creators, longest prefix first so collaborations win.
const ARTISTS = [
  ["liz-prince-and-jim-kettner", "Liz Prince & Jim Kettner"],
  ["jim-kettner-and-eric-weiss", "Jim Kettner & Eric Weiss"],
  ["ramsey-beyer", "Ramsey Beyer"],
  ["mikey-heller", "Mikey Heller"],
  ["sally-madden", "Sally Madden"],
  ["liz-baillie", "Liz Baillie"],
  ["liz-prince", "Liz Prince"],
  ["jim-kettner", "Jim Kettner"],
].sort((a, b) => b[0].length - a[0].length);

// Orphans / incomplete singles to drop (their full strips live under another
// slug, or pages 1..N-1 are missing).
const EXCLUDE = new Set([
  "ramsey-beyer-king-of-the-beach-2", // stray dup of -kings-of-the-beach
  "jim-kettner-back-in-the-day-2", // orphan page, no page 1
  "liz-prince-taste-of-chaos-day-4", // orphan page 4 only
]);

// Light title fixups the slug can't carry (apostrophes, proper nouns).
const TITLE_FIX = {
  "hes my ex": "He's My Ex",
  "i dont want to grow up": "I Don't Want to Grow Up",
  "cant bro down": "Can't Bro Down",
  "chaos in tejas day": "Chaos in Tejas",
  "comic about ipods": "Comic About iPods",
  "scene report confidential la": "Scene Report Confidential LA",
};

const SMALL = ["a", "an", "and", "the", "of", "to", "in", "on", "at", "for", "with", "from", "or", "but", "nor"];
function titleCase(slug) {
  const words = slug.split("-");
  return words
    .map((w, i) =>
      i > 0 && SMALL.includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

// All full-size originals (drop WP size variants), preferring .jpg over .png.
const all = readdirSync(DIR).filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
const isVariant = (f) => /-(50x50|200x200|280x280|main)\.(jpg|jpeg|png)$/i.test(f);
const originals = all.filter((f) => !isVariant(f));
const bases = new Set(originals.map((f) => f.replace(/\.[^.]+$/, "")));

// jpg wins when both jpg+png exist for the same base name.
const byBase = new Map();
for (const f of originals) {
  const base = f.replace(/\.[^.]+$/, "");
  const prev = byBase.get(base);
  if (!prev || (/\.png$/i.test(prev) && /\.jpe?g$/i.test(f))) byBase.set(base, f);
}

// Group pages. A trailing -N/_N is a page only when the de-numbered base also
// exists as a file, or when 2+ siblings share it (e.g. day-1..4 with no base).
const groups = new Map();
const baseCount = new Map();
for (const base of byBase.keys()) {
  const m = base.match(/^(.*?)[-_](\d+)$/);
  if (m) baseCount.set(m[1], (baseCount.get(m[1]) ?? 0) + 1);
}
function groupKeyFor(base) {
  const m = base.match(/^(.*?)[-_](\d+)$/);
  if (m && (bases.has(m[1]) || baseCount.get(m[1]) >= 2)) {
    return { key: m[1], page: Number(m[2]) };
  }
  return { key: base, page: 1 };
}

for (const [base, file] of byBase) {
  const { key, page } = groupKeyFor(base);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ file, page });
}

const comics = [];
const usedSlugs = new Set();
for (const [key, pagesRaw] of groups) {
  if (EXCLUDE.has(key)) continue;

  const match = ARTISTS.find(
    ([slug]) => key === slug || key.startsWith(slug + "-"),
  );
  if (!match) continue; // unknown creator (music-mondays, webcolorsummerjams…)
  const [artistSlug, artistName] = match;

  const titleSlug = key === artistSlug ? "" : key.slice(artistSlug.length + 1);
  if (!titleSlug) continue; // bare creator avatar, not a strip

  const rawTitle = titleCase(titleSlug);
  const title = TITLE_FIX[rawTitle.toLowerCase()] ?? rawTitle;

  let slug = key;
  while (usedSlugs.has(slug)) slug += "-2";
  usedSlugs.add(slug);

  const pages = pagesRaw
    .sort((a, b) => a.page - b.page)
    .map((p) => p.file);

  comics.push({
    id: comics.length + 1,
    title,
    slug,
    artist_name: artistName,
    artist_slug: artistSlug,
    title_slug: titleSlug,
    description: null,
    pages,
    released_at: null, // unknown without the dump; enrich later
    publish: 1,
  });
}

comics.sort(
  (a, b) =>
    a.artist_name.localeCompare(b.artist_name) || a.title.localeCompare(b.title),
);
comics.forEach((c, i) => (c.id = i + 1));

console.log(`comics: ${comics.length}`);
for (const c of comics)
  console.log(
    `  ${c.artist_name} — ${c.title}  (${c.pages.length}p) [${c.slug}]`,
  );

if (DRY) console.log("--dry: no file written");
else {
  const out = new URL("../db/data/comics.json", import.meta.url);
  writeFileSync(out, JSON.stringify(comics, null, 1) + "\n");
  console.log(`wrote ${out.pathname}`);
}
