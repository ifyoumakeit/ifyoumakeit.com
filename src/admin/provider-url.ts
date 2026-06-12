// Admin-only: external "watch on host" URL for a video. Flash files aren't
// hosted anywhere yet (provider_id is a legacy .flv filename), so they return
// null and the UI shows the filename as plain text instead of a link.
export function getProviderUrl(provider: string, providerId: string): string | null {
  const id = String(providerId ?? "").trim();
  if (!id) return null;
  switch (provider) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    case "vimeo":
      return `https://vimeo.com/${encodeURIComponent(id)}`;
    case "dailymotion":
      return `https://www.dailymotion.com/video/${encodeURIComponent(id)}`;
    default:
      return null; // flash / unknown
  }
}
