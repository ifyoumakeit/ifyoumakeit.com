// Rewrite legacy internal cross-links inside album descriptions to the current
// static URL structure. Only touches links on the old IYMI domain whose target
// exists in the catalog, so we never mint an internal 404. External links
// (bandcamp, labels, etc.) and still-valid /video/ links are left alone.
//
//   //ifyoumakeit.com/album/{artist}/{slug}/  -> /albums/{artist}/{slug}/
//   //ifyoumakeit.com/author/{slug}/          -> /artists/{slug}/
//   //ifyoumakeit.com/category/{section}      -> /albums/ | /sessions/ | /live/ | /series/
//
// Usage: node scripts/fix-album-links.mjs [--dry]
import { readFileSync, writeFileSync } from "node:fs";

const DRY = process.argv.includes("--dry");
const FILE = new URL("../db/data/albums.json", import.meta.url);
const albums = JSON.parse(readFileSync(FILE, "utf8"));
const artists = JSON.parse(
  readFileSync(new URL("../db/data/artists.json", import.meta.url), "utf8"),
);
const videos = JSON.parse(
  readFileSync(new URL("../db/data/videos.json", import.meta.url), "utf8"),
);

const songSlug = (a) =>
  a.slug.startsWith(`${a.artist_slug}-`)
    ? a.slug.slice(a.artist_slug.length + 1)
    : a.slug;

const albumUrls = new Set(
  albums.map((a) => `/albums/${a.artist_slug}/${songSlug(a)}/`),
);

// An /artists/{slug}/ page exists for any artist with a published video OR
// album — mirror that route's getStaticPaths so we only rewrite links that land.
const publishedVideoArtistIds = new Set(
  videos.filter((v) => v.publish !== 0).map((v) => v.artist_id),
);
const artistSlugs = new Set([
  ...artists.filter((a) => publishedVideoArtistIds.has(a.id)).map((a) => a.slug),
  ...albums.map((a) => a.artist_slug),
]);
const CATEGORY = {
  albums: "/albums/",
  sessions: "/sessions/",
  live: "/live/",
  series: "/series/",
};

// Anchor every pattern to the old IYMI domain so external */album/* links
// (e.g. bandcamp.com/album/...) stay out of scope.
const IYMI = String.raw`(?:https?:)?//(?:www\.)?ifyoumakeit\.com`;
const albumRe = new RegExp(`${IYMI}/album/([a-z0-9-]+)/([a-z0-9-]+)/?`, "g");
const authorRe = new RegExp(`${IYMI}/author/([a-z0-9-]+)/?`, "g");
const categoryRe = new RegExp(`${IYMI}/category/([a-z0-9-]+)/?`, "g");

const tally = { album: [0, 0], author: [0, 0], category: [0, 0] };

for (const a of albums) {
  if (!a.description) continue;
  let d = a.description;

  d = d.replace(albumRe, (m, artist, slug) => {
    const url = `/albums/${artist}/${slug}/`;
    if (albumUrls.has(url)) return tally.album[0]++, url;
    return tally.album[1]++, m;
  });

  d = d.replace(authorRe, (m, slug) => {
    if (artistSlugs.has(slug)) return tally.author[0]++, `/artists/${slug}/`;
    return tally.author[1]++, m;
  });

  d = d.replace(categoryRe, (m, slug) => {
    if (CATEGORY[slug]) return tally.category[0]++, CATEGORY[slug];
    return tally.category[1]++, m;
  });

  a.description = d;
}

for (const [k, [hit, miss]] of Object.entries(tally)) {
  console.log(`${k}: ${hit} rewritten, ${miss} left (no current target)`);
}

if (DRY) {
  console.log("--dry: no file written");
} else {
  writeFileSync(FILE, JSON.stringify(albums, null, 1) + "\n");
  console.log(`wrote ${FILE.pathname}`);
}
