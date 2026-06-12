import { Marked } from "marked";

// Render Markdown description fields (albums, videos) to HTML at build time.
// Descriptions are authored as Markdown in the local admin and stored as
// Markdown in db/data/*.json; pages render them with `set:html`. `breaks: true`
// turns single newlines into <br> so the textarea WYSIWYG matches the output.
// Content is first-party (admin-authored), so no sanitization step is needed.
const marked = new Marked({ gfm: true, breaks: true });

export function renderMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return marked.parse(md, { async: false }) as string;
}
