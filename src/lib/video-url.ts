interface VideoPathData {
  slug: string;
  title: string;
}

interface ArtistPathData {
  slug: string;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function getVideoSongSlug(
  video: VideoPathData,
  artist: ArtistPathData,
): string {
  const artistPrefix = `${artist.slug}-`;
  if (video.slug.startsWith(artistPrefix)) {
    return video.slug.slice(artistPrefix.length);
  }

  return slugify(video.title) || video.slug;
}

export function getVideoUrl(
  video: VideoPathData,
  artist: ArtistPathData,
): string {
  return `/video/${artist.slug}/${getVideoSongSlug(video, artist)}/`;
}
