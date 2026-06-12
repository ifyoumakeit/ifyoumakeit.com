// One-time migration: convert the HTML `description` fields in albums.json and
// videos.json to Markdown (the new authoring/storage format). Idempotent-ish:
// running it again on already-Markdown text mostly no-ops, but it's intended to
// run once. Prints a sample so the conversion can be eyeballed.
//
// Usage: node scripts/migrate-descriptions-to-md.mjs [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import { htmlToMarkdown } from "./lib/html-to-md.mjs";

const DRY = process.argv.includes("--dry");
const FILES = ["db/data/albums.json", "db/data/videos.json"];

for (const file of FILES) {
  const rows = JSON.parse(readFileSync(file, "utf8"));
  let changed = 0;
  let sample = null;
  for (const row of rows) {
    if (!row.description || !row.description.trim()) continue;
    const before = row.description;
    const after = htmlToMarkdown(before);
    if (after !== before) {
      if (!sample && /href|<a|<em|<strong/i.test(before))
        sample = { before, after };
      row.description = after;
      changed++;
    }
  }
  console.log(`\n${file}: ${changed}/${rows.length} descriptions converted`);
  if (sample) {
    console.log("--- sample HTML in ---\n" + sample.before.slice(0, 280));
    console.log("--- sample MD out ---\n" + (sample.after ?? "").slice(0, 280));
  }
  if (!DRY) writeFileSync(file, JSON.stringify(rows, null, 1) + "\n");
}

console.log(DRY ? "\n--dry: no files written" : "\nwrote albums.json + videos.json");
