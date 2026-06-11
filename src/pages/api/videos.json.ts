import type { APIRoute } from "astro";
import { db, eq, video, artist, series, tag, videoTag } from "astro:db";

export const prerender = true;

export const GET: APIRoute = async () => {
  const allVideos = await db.select().from(video).where(eq(video.publish, 1));
  const allArtists = await db.select().from(artist);
  const allSeries = await db.select().from(series).where(eq(series.publish, 1));
  const allTags = await db.select().from(tag);
  const allVideoTags = await db.select().from(videoTag);

  const artistById = new Map(allArtists.map((a) => [a.id, a]));
  const seriesById = new Map(allSeries.map((s) => [s.id, s]));
  const tagById = new Map(allTags.map((t) => [t.id, t]));

  // Build tag name list per video
  const tagsByVideo = new Map<number, string[]>();
  for (const vt of allVideoTags) {
    const t = tagById.get(vt.tag_id);
    if (t) {
      if (!tagsByVideo.has(vt.video_id)) tagsByVideo.set(vt.video_id, []);
      tagsByVideo.get(vt.video_id)!.push(t.name);
    }
  }

  const result = allVideos
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    .map((v) => {
      const a = artistById.get(v.artist_id);
      const s = seriesById.get(v.series_id);
      return {
        id: v.id,
        title: v.title,
        slug: v.slug,
        url: s ? `/${s.slug}/${v.slug}/` : `/${v.slug}/`,
        artist: a?.name ?? "",
        artistSlug: a?.slug ?? "",
        series: s?.title ?? "",
        seriesSlug: s?.slug ?? "",
        recordedAt: v.recorded_at instanceof Date
          ? v.recorded_at.toISOString()
          : new Date(v.recorded_at).toISOString(),
        provider: v.provider,
        providerId: v.provider_id,
        tags: tagsByVideo.get(v.id) ?? [],
      };
    });

  return new Response(JSON.stringify(result, null, 2), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
