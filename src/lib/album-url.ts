// URL helpers for albums, mirroring video-url.ts. The stored `album.slug` is a
// unique artist-prefixed slug (also the cover-art / legacy download key); the
// public URL is /albums/{artist}/{album} with the artist prefix stripped.

interface AlbumPathData {
  slug: string;
  artist_slug: string;
}

export function getAlbumSongSlug(albumItem: AlbumPathData): string {
  const prefix = `${albumItem.artist_slug}-`;
  if (albumItem.slug.startsWith(prefix)) {
    return albumItem.slug.slice(prefix.length);
  }
  return albumItem.slug;
}

export function getAlbumUrl(albumItem: AlbumPathData): string {
  return `/albums/${albumItem.artist_slug}/${getAlbumSongSlug(albumItem)}/`;
}
