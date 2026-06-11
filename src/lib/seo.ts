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
