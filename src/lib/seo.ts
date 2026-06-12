export const SITE_NAME = "If You Make It";
export const SITE_URL = "https://www.ifyoumakeit.com";
export const DEFAULT_DESCRIPTION =
  "DIY punk videos, Pink Couch Sessions, live recordings, and music videos from 2007–2014.";
export const DEFAULT_SOCIAL_IMAGE = "/og-default.png";

export function toPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Human-readable, keyword-bearing descriptor for each series. The raw series
// titles ("Sessions", "Live") are too terse to carry SEO weight on their own.
const SERIES_DESCRIPTOR: Record<string, string> = {
  sessions: "acoustic session",
  live: "live performance",
  series: "video feature",
};

// Truncate to a max length at a word boundary, appending an ellipsis only if
// the text was actually cut. Sentence-ending punctuation is preserved.
export function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).replace(
    /[\s,;:–—-]+$/,
    "",
  );
  return `${cut}…`;
}

// Title: artist-first, song quoted, year for era/recency. The brand suffix is
// added by Layout.astro. e.g. `Greg Farley – "Springtown Blues" (2007)`
export function buildVideoTitle(
  artistName: string,
  songTitle: string,
  year: number,
): string {
  return `${artistName} – "${songTitle}" (${year})`;
}

// Meta/OG description: a keyword-rich lead (artist, song, series, date,
// location) followed by the curator's own note, trimmed to a SERP-friendly
// length. The visible on-page description is unaffected.
export function buildVideoMetaDescription(opts: {
  artistName: string;
  songTitle: string;
  seriesSlug: string;
  recordedAt: Date;
  location?: string | null;
  note?: string | null;
}): string {
  const descriptor = SERIES_DESCRIPTOR[opts.seriesSlug] ?? "video";
  const article = /^[aeiou]/i.test(descriptor) ? "an" : "a";
  const monthYear = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(opts.recordedAt);
  let lead = `${opts.artistName} performs "${opts.songTitle}", ${article} ${descriptor} recorded ${monthYear}`;
  if (opts.location) lead += ` in ${opts.location}`;
  lead += ".";
  const note = opts.note ? toPlainText(opts.note) : "";
  return truncateAtWord(note ? `${lead} ${note}` : lead, 158);
}
