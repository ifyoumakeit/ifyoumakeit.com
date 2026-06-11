import type { APIRoute } from "astro";
import { db, eq, video, artist, series, tag, videoTag } from "astro:db";
import { SITE_URL } from "../lib/seo";
import { getVideoUrl } from "../lib/video-url";

export const prerender = true;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async () => {
  const allVideos = await db.select().from(video).where(eq(video.publish, 1));
  const allArtists = await db.select().from(artist);
  const allSeries = await db.select().from(series).where(eq(series.publish, 1));
  const allTags = await db.select().from(tag);
  const allVideoTags = await db.select().from(videoTag);

  const artistById = new Map(allArtists.map((item) => [item.id, item]));
  const artistIds = new Set(allVideos.map((item) => item.artist_id));
  const years = new Set(
    allVideos.map((item) => new Date(item.recorded_at).getUTCFullYear()),
  );
  const publishedVideoIds = new Set(allVideos.map((item) => item.id));
  const activeTagIds = new Set(
    allVideoTags
      .filter((item) => publishedVideoIds.has(item.video_id))
      .map((item) => item.tag_id),
  );

  const paths = new Set<string>([
    "/",
    "/artists/",
    "/years/",
    "/tags/",
    ...allSeries.map((item) => `/${item.slug}/`),
    ...allArtists
      .filter((item) => artistIds.has(item.id))
      .map((item) => `/artists/${item.slug}/`),
    ...[...years].map((year) => `/years/${year}/`),
    ...allTags
      .filter((item) => activeTagIds.has(item.id))
      .map((item) => `/tags/${item.slug}/`),
    ...allVideos.flatMap((item) => {
      const videoArtist = artistById.get(item.artist_id);
      return videoArtist ? [getVideoUrl(item, videoArtist)] : [];
    }),
  ]);

  const body = [...paths]
    .sort()
    .map(
      (path) =>
        `  <url><loc>${xmlEscape(new URL(path, SITE_URL).href)}</loc></url>`,
    )
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
