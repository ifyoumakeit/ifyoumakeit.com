// Shared HTML -> Markdown conversion for the legacy descriptions, used by the
// one-time migration and by the legacy importers so future re-imports also emit
// Markdown. Common formatting (paragraphs, links, bold/italic, hr) becomes
// clean Markdown; tags with no good Markdown equivalent (cite, sup, sub,
// blockquote, s/u, span) are flattened to plain text, and embeds are dropped.
import TurndownService from "turndown";

const NBSP = String.fromCharCode(160);

function makeConverter() {
  const td = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });

  // Unwrap odd inline/block tags to their text content (drop the formatting).
  td.addRule("unwrap-odd", {
    filter: ["cite", "sup", "sub", "s", "strike", "u", "span", "font", "small", "blockquote"],
    replacement: (content) => content,
  });
  // Remove embeds/iframes and any script/style/img entirely.
  td.remove(["embed", "iframe", "object", "script", "style", "img"]);

  return td;
}

export function htmlToMarkdown(html) {
  if (!html) return null;
  const md = makeConverter()
    .turndown(html)
    .split(NBSP)
    .join(" ") // nbsp -> normal space
    // A URL flush against a <br> can get trapped inside a turndown autolink
    // (e.g. <http://x/\<br /\>>). Strip any leftover (escaped) <br> remnant.
    .replace(/\\?<br\s*\/?\s*\\?>/gi, "")
    // Unwrap angle-bracketed URLs left in link destinations: ](<url>) -> ](url)
    .replace(/\]\(<\s*([^>]+?)\s*>\)/g, "]($1)")
    .replace(/[ \t]+\n/g, "\n") // drop trailing spaces; breaks:true handles line breaks
    .replace(/\n{3,}/g, "\n\n") // collapse blank lines
    .trim();
  return md || null;
}
