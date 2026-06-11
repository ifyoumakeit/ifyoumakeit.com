import { readdirSync } from "node:fs";

// Build-time index of local video thumbnails. Files live in
// public/thumbs/video/{video.slug}.jpg — the slug IS the reference,
// no db column needed. Missing files simply fall back (YouTube thumb
// or styled placeholder), so partial coverage is fine.
let names: Set<string>;
try {
  names = new Set(readdirSync("public/thumbs/video"));
} catch {
  names = new Set();
}

export function getLocalThumb(slug: string): string | null {
  return names.has(`${slug}.jpg`) ? `/thumbs/video/${slug}.jpg` : null;
}
