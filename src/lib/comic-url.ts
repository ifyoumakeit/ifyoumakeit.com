// URL + asset helpers for comics, mirroring album-url.ts. The stored
// `comic.slug` is the artist-prefixed key; the public URL is
// /comics/{artist}/{comic} with the artist prefix stripped (`title_slug`).

interface ComicPathData {
  artist_slug: string;
  title_slug: string;
}

export function getComicUrl(comicItem: ComicPathData): string {
  return `/comics/${comicItem.artist_slug}/${comicItem.title_slug}/`;
}

// Resolve a stored page filename to its public path under public/thumbs/comic/.
export function getComicPageSrc(file: string): string {
  return `/thumbs/comic/${file}`;
}
