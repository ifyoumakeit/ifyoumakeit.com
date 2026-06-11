import { readdirSync } from "node:fs";

// Build-time index of local video thumbnails (public/thumbs/video/).
// Files came over from the legacy site named after the old slugs, with
// quirks: double/trailing dashes, `&#039;` entity remnants, `-main` and
// `-{W}x{H}` size variants. We normalize both sides the same way the
// importer builds video.slug, so the slug is the only reference needed —
// no db column. Missing files fall back (YouTube thumb or placeholder).

/** Normalize a slug or filename base to a comparable key. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/-(main|\d+x\d+)$/, "") // variant suffixes
    .replace(/-?0?39-?/g, "") // &#039; entity remnants in old slugs
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lower rank wins when several files normalize to the same key. */
function rank(base: string): number {
  if (/-main$/.test(base)) return 1;
  const size = base.match(/-(\d+)x\d+$/);
  if (size) return 3 - Number(size[1]) / 100000; // bigger size, better rank
  return 0; // plain name is best
}

// Legacy files whose names lost the artist prefix entirely.
const ALIASES: Record<string, string> = {
  "dave-hause-pray-for-tucson": "pray-for-tucson",
};

let index: Map<string, string>;
try {
  const files = readdirSync("public/thumbs/video")
    .filter((f) => f.endsWith(".jpg"))
    .sort((a, b) => rank(a.slice(0, -4)) - rank(b.slice(0, -4)));
  index = new Map();
  for (const f of files) {
    const key = normalize(f.slice(0, -4));
    if (!index.has(key)) index.set(key, f);
  }
} catch {
  index = new Map();
}

export function getLocalThumb(slug: string): string | null {
  const key = ALIASES[slug] ?? normalize(slug);
  let file = index.get(key);
  // Importer dedupe suffix (-2, -3…) marks a duplicate post of the same
  // video — reuse the base image.
  if (!file) {
    const base = key.replace(/-\d$/, "");
    if (base !== key) file = index.get(base);
  }
  return file ? `/thumbs/video/${encodeURIComponent(file)}` : null;
}
