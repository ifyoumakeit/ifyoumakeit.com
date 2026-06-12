import { readdirSync } from "node:fs";

// Build-time index of local album cover art (public/thumbs/album/). Covers are
// keyed by the album slug exactly (e.g. swearin-swearin.jpg). Missing files
// fall back to a styled CSS placeholder, same as video thumbnails.

let index: Set<string>;
try {
  index = new Set(
    readdirSync("public/thumbs/album").filter((f) =>
      /\.(jpe?g|png|webp)$/i.test(f),
    ),
  );
} catch {
  index = new Set();
}

const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export function getAlbumCover(slug: string): string | null {
  for (const ext of EXTENSIONS) {
    const file = `${slug}.${ext}`;
    if (index.has(file)) return `/thumbs/album/${file}`;
  }
  return null;
}
